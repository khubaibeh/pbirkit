import type { VisualContainerGroupState } from "#schemas/bookmark/shared.ts";

import type { Config } from "./config.ts";
import { at as valueAt } from "./expr/query.ts";

const NAME = /^[\p{L}\p{Mn}\p{Nd}\p{Pc}-]+$/u;
const MAX_NAME = 50;

const insideProject = (path: string): boolean =>
	path
		.replace(/^\.\//u, "")
		.replace(/\/$/u, "")
		.split("/")
		.every((part) => part !== "" && part !== "." && part !== ".." && !/[\\:]/u.test(part));

type Page = Config["report"]["pages"][number];
type Visual = Page["visuals"][number];
type BookmarkItem = NonNullable<Config["report"]["bookmarks"]>["items"][number];
type Bookmark = Exclude<BookmarkItem, { readonly children: unknown }>;
type VisualsByPage = ReadonlyMap<string, ReadonlyMap<string, Visual>>;
type GroupStates = { readonly [name: string]: VisualContainerGroupState };

interface SectionState {
	readonly visualContainers: object;
	readonly visualContainerGroups?: GroupStates;
}

export interface ConfigIssues {
	readonly errors: ReadonlyArray<string>;
	readonly warnings: ReadonlyArray<string>;
}

const LINKS = { bookmark: "bookmark", navigationSection: "page", drillthroughSection: "page" } as const;

const nameIssue = (where: string, name: string): ReadonlyArray<string> => [
	...(NAME.test(name) ? [] : [`${where}: name "${name}" must use only letters, digits, "_" or "-"`]),
	...(name.length > MAX_NAME ? [`${where}: name "${name}" is longer than ${MAX_NAME} characters`] : []),
];

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => [
	...new Set(names.filter((name, index) => names.indexOf(name) !== index)),
];

const inGroupCycle = (start: Visual, byName: ReadonlyMap<string, Visual>): boolean => {
	const seen = new Set<string>();
	let current = start.parentGroupName === undefined ? undefined : byName.get(start.parentGroupName);
	while (current !== undefined && !seen.has(current.name)) {
		if (current.name === start.name) return true;
		seen.add(current.name);
		current = current.parentGroupName === undefined ? undefined : byName.get(current.parentGroupName);
	}
	return false;
};

const checkPage = (page: Page): ReadonlyArray<string> => {
	const where = `page "${page.name}"`;
	const byName = new Map(page.visuals.map((visual) => [visual.name, visual]));
	const issues: Array<string> = [...nameIssue(where, page.name)];
	for (const name of duplicates(page.visuals.map((visual) => visual.name)))
		issues.push(`${where}: visual name "${name}" is used more than once`);
	for (const visual of page.visuals) {
		const at = `${where} visual "${visual.name}"`;
		issues.push(...nameIssue(at, visual.name));
		if (visual.parentGroupName === undefined) continue;
		const parent = byName.get(visual.parentGroupName);
		if (parent === undefined)
			issues.push(`${at}: parentGroupName "${visual.parentGroupName}" is not a visual on this page`);
		else if (!("visualGroup" in parent))
			issues.push(`${at}: parentGroupName "${visual.parentGroupName}" is not a group`);
		else if (inGroupCycle(visual, byName)) issues.push(`${at}: parent groups form a cycle`);
	}
	for (const [index, interaction] of (page.visualInteractions ?? []).entries())
		for (const end of ["source", "target"] as const)
			if (!byName.has(interaction[end]))
				issues.push(
					`${where} visualInteractions[${index}]: ${end} "${interaction[end]}" is not a visual on this page`,
				);
	return issues;
};

const textLiteral = (value: unknown): string | undefined => {
	const text = valueAt(valueAt(valueAt(value, "expr"), "Literal"), "Value");
	return typeof text === "string" && /^'.*'$/su.test(text)
		? text.slice(1, -1).replaceAll("''", "'")
		: undefined;
};

const visualLinks = (visual: Visual) => {
	const entries = valueAt(valueAt(valueAt(visual, "visual"), "visualContainerObjects"), "visualLink");
	const list: ReadonlyArray<unknown> = Array.isArray(entries) ? entries : [];
	return list.flatMap((entry) =>
		Object.entries(LINKS).flatMap(([property, kind]) => {
			const name = textLiteral(valueAt(valueAt(entry, "properties"), property));
			return name === undefined ? [] : [{ property, kind, name }];
		}),
	);
};

const groupNames = (groups: GroupStates = {}): ReadonlyArray<string> =>
	Object.entries(groups).flatMap(([name, state]) => [name].concat(groupNames(state.children)));

const checkBookmark = (bookmark: Bookmark, visualsByPage: VisualsByPage): ReadonlyArray<string> => {
	const where = `bookmark "${bookmark.name}"`;
	const { activeSection } = bookmark.explorationState;
	const sections: { readonly [name: string]: SectionState } = bookmark.explorationState.sections;
	const active = visualsByPage.get(activeSection);
	return [
		...(active === undefined
			? [`${where}: activeSection "${activeSection}" is not a page in this report`]
			: (bookmark.options?.targetVisualNames ?? [])
					.filter((name) => !active.has(name))
					.map((name) => `${where}: target visual "${name}" is not a visual on page "${activeSection}"`)),
		...Object.entries(sections).flatMap(([section, state]) => {
			const visuals = visualsByPage.get(section);
			if (visuals === undefined) return [`${where}: section "${section}" is not a page in this report`];
			const missing = Object.keys(state.visualContainers)
				.filter((name) => !visuals.has(name))
				.map((name) => `${where} section "${section}": visual "${name}" is not a visual on this page`);
			return missing.concat(
				groupNames(state.visualContainerGroups)
					.filter((name) => {
						const visual = visuals.get(name);
						return visual === undefined || !("visualGroup" in visual);
					})
					.map((name) => `${where} section "${section}": group "${name}" is not a group on this page`),
			);
		}),
	];
};

export const checkConfig = (config: Config): ConfigIssues => {
	const { pages, pagesMetadata } = config.report;
	const pageNames = pages.map((page) => page.name);
	const bindings = pages.flatMap((page) =>
		"pageBinding" in page && page.pageBinding !== undefined ? [page.pageBinding.name] : [],
	);
	const pageRefs = {
		activePageName: pagesMetadata.activePageName,
		landingPageName: "landingPageName" in pagesMetadata ? pagesMetadata.landingPageName : undefined,
	};
	const items = config.report.bookmarks?.items ?? [];
	const bookmarks = items.flatMap((item): ReadonlyArray<Bookmark> =>
		"children" in item ? item.children : [item],
	);
	const groups = items.flatMap((item) => ("children" in item ? [item] : []));
	const bookmarkNames = new Set(bookmarks.map((bookmark) => bookmark.name));
	const visualsByPage: VisualsByPage = new Map(
		pages.map((page) => [page.name, new Map(page.visuals.map((visual) => [visual.name, visual]))]),
	);
	const errors = [
		...duplicates(pageNames).map((name) => `report: page name "${name}" is used more than once`),
		...duplicates(bindings).map((name) => `report: pageBinding name "${name}" is used more than once`),
		...Object.entries(pageRefs).flatMap(([key, name]) =>
			name === undefined || pageNames.includes(name)
				? []
				: [`report: ${key} "${name}" is not a page in this report`],
		),
		...(insideProject(config.model.path)
			? []
			: [
					`model: path "${config.model.path}" must be a relative path inside the project, with "/" as the separator`,
				]),
		...pages.flatMap((page) => checkPage(page)),
		...duplicates([...bookmarks, ...groups].map((item) => item.name)).map(
			(name) => `report: bookmark name "${name}" is used more than once`,
		),
		...bookmarks.flatMap((bookmark) => nameIssue(`bookmark "${bookmark.name}"`, bookmark.name)),
		...groups.flatMap((group) => nameIssue(`bookmark group "${group.name}"`, group.name)),
	];
	const warnings = [
		...bookmarks.flatMap((bookmark) => checkBookmark(bookmark, visualsByPage)),
		...pages.flatMap((page) =>
			page.visuals.flatMap((visual) =>
				visualLinks(visual)
					.filter((link) =>
						link.kind === "bookmark" ? !bookmarkNames.has(link.name) : !visualsByPage.has(link.name),
					)
					.map(
						(link) =>
							`page "${page.name}" visual "${visual.name}": visualLink ${link.property} "${link.name}" is not a ${link.kind} in this report`,
					),
			),
		),
	];
	return {
		errors: errors.map((issue) => `[ERROR] check: ${issue}`),
		warnings: warnings.map((issue) => `[WARN] check: ${issue}`),
	};
};
