import type { VisualContainerGroupState } from "#schemas/bookmark/shared.ts";

import type { Config } from "./config.ts";
import { at as valueAt } from "./expr/query.ts";
import {
	MAX_FONT_SIZE,
	MIN_FONT_SIZE,
	isBuiltinFont,
	isFamilyName,
	isFontKey,
	isFontSize,
	isFontSizeKey,
} from "./font.ts";
import { packageItem } from "./resource.ts";
import type { Resource } from "./resource.ts";
import { isBuiltinVisual } from "./visual-type.ts";

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

const strings = (value: unknown): ReadonlyArray<string> =>
	Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const list = (value: unknown): ReadonlyArray<unknown> => (Array.isArray(value) ? value : []);

const treeDepth = (node: unknown): number =>
	list(valueAt(node, "children")).reduce<number>((depth, child) => Math.max(depth, 1 + treeDepth(child)), 0);

const fieldRefs = (visual: Visual, role: string): ReadonlyArray<string> =>
	list(
		valueAt(valueAt(valueAt(valueAt(valueAt(visual, "visual"), "query"), "queryState"), role), "projections"),
	).flatMap((projection) => strings([valueAt(projection, "queryRef")]));

const expansionIssues = (where: string, visual: Visual, states: unknown): ReadonlyArray<string> =>
	list(states).flatMap((state, index) => {
		const at = `${where} expansionStates[${index}]`;
		const fields = strings(valueAt(state, "roles")).flatMap((role) => fieldRefs(visual, role));
		const levels = list(valueAt(state, "levels"));
		const refs = levels.flatMap((level) => strings(valueAt(level, "queryRefs")));
		const positions = refs.map((ref) => fields.indexOf(ref)).filter((position) => position !== -1);
		const depth = treeDepth(valueAt(state, "root"));
		return refs
			.filter((ref) => !fields.includes(ref))
			.map((ref) => `${at}: level "${ref}" is not a field of visual "${visual.name}"`)
			.concat(
				positions.some((position, step) => step > 0 && position < (positions[step - 1] ?? 0))
					? [`${at}: levels are not in the same order as the fields of visual "${visual.name}"`]
					: [],
				depth > levels.length
					? [`${at}: the tree is ${depth} levels deep, but the state lists only ${levels.length} levels`]
					: [],
			);
	});

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
			const expansions = Object.entries(state.visualContainers).flatMap(([name, container]) => {
				const visual = visuals.get(name);
				return visual === undefined
					? []
					: expansionIssues(
							`${where} section "${section}" visual "${name}"`,
							visual,
							valueAt(valueAt(container, "singleVisual"), "expansionStates"),
						);
			});
			return missing.concat(
				expansions,
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

const nested = (value: unknown, key: string): ReadonlyArray<unknown> => {
	if (typeof value !== "object" || value === null) return [];
	const own = key in value ? [Reflect.get(value, key)] : [];
	return own.concat(Object.values(value).flatMap((child) => nested(child, key)));
};

const pathIssue = (where: string, name: string): ReadonlyArray<string> =>
	name === "" || name === "." || name === ".." || /[\\/:*?"<>|]/u.test(name)
		? [`${where}: name "${name}" must be a plain file name`]
		: [];

const resourceLabel = (resource: Resource): string =>
	resource.kind === "customVisual"
		? `custom visual "${resource.guid}"`
		: `${resource.kind} "${resource.name}"`;

const customVisualTypes = (config: Config): ReadonlySet<string> => {
	const { definition, resources } = config.report;
	const listed = "publicCustomVisuals" in definition ? (definition.publicCustomVisuals ?? []) : [];
	const organization =
		"organizationCustomVisuals" in definition ? (definition.organizationCustomVisuals ?? []) : [];

	return new Set([
		...listed,
		...organization.map((visual) => visual.name),
		...(resources ?? []).flatMap((resource) => (resource.kind === "customVisual" ? [resource.guid] : [])),
	]);
};

const visualTypeIssues = (config: Config): ReadonlyArray<string> => {
	const custom = customVisualTypes(config);

	return config.report.pages.flatMap((page) =>
		page.visuals.flatMap((visual) => {
			const type = "visual" in visual ? visual.visual?.visualType : undefined;

			return type === undefined || isBuiltinVisual(type) || custom.has(type)
				? []
				: [
						`page "${page.name}" visual "${visual.name}": visualType "${type}" is not a Power BI visual or a custom visual listed in the report`,
					];
		}),
	);
};

const sourceIssues = (config: Config): ReadonlyArray<string> => {
	const { model } = config;
	const sources: ReadonlyArray<readonly [string, URL | undefined]> = [
		["model: definition", model?.definition],
		["model: diagramLayout", model?.diagramLayout],
		["model: daxQueries", model?.daxQueries],
		["model: cache", model?.cache],
		...(config.report.resources ?? []).flatMap((resource) =>
			resource.kind === "image" ? [[`${resourceLabel(resource)}: file`, resource.file] as const] : [],
		),
	];
	return sources.flatMap(([where, url]) =>
		url === undefined || url.protocol === "file:" ? [] : [`${where} "${url.href}" must be a file: URL`],
	);
};

const checkResources = (config: Config) => {
	const { definition, resources } = config.report;
	if (resources === undefined) return { errors: [], warnings: [] };
	const items = resources.map((resource) => packageItem(resource));
	const errors = [
		...("resourcePackages" in definition && definition.resourcePackages !== undefined
			? ["report: remove definition.resourcePackages, the build writes it from report.resources"]
			: []),
		...duplicates(items.map(({ package: name, item }) => `${name}/${item.name}`)).map(
			(name) => `report: resource "${name}" is listed more than once`,
		),
		...resources.flatMap((resource) =>
			resource.kind === "customVisual"
				? pathIssue(resourceLabel(resource), resource.guid).concat(
						resource.pbiviz !== undefined && resource.pbiviz.visual.guid !== resource.guid
							? [`${resourceLabel(resource)}: pbiviz guid "${resource.pbiviz.visual.guid}" does not match`]
							: [],
					)
				: pathIssue(resourceLabel(resource), resource.name),
		),
	];
	const { baseTheme, customTheme } = definition.themeCollection;
	const themes = (
		[
			["baseTheme", baseTheme],
			["customTheme", customTheme],
		] as const
	).flatMap(([kind, theme]) =>
		theme === undefined ||
		resources.some((resource) => resource.kind === kind && resource.name === theme.name)
			? []
			: [`report: themeCollection ${kind} "${theme.name}" is not a ${kind} in report.resources`],
	);
	const links = config.report.pages.flatMap((page) =>
		page.visuals.flatMap((visual) =>
			nested(visual, "ResourcePackageItem").flatMap((ref) => {
				const packageName = valueAt(ref, "PackageName");
				const itemName = valueAt(ref, "ItemName");
				return items.some(({ package: name, item }) => name === packageName && item.name === itemName)
					? []
					: [
							`page "${page.name}" visual "${visual.name}": resource "${String(packageName)}/${String(itemName)}" is not in report.resources`,
						];
			}),
		),
	);
	return { errors, warnings: themes.concat(links) };
};

const fontFaces = (value: unknown): ReadonlyArray<string> =>
	typeof value === "object" && value !== null
		? Object.entries(value).flatMap(([key, child]) =>
				(isFontKey(key) ? strings([typeof child === "string" ? child : textLiteral(child)]) : []).concat(
					fontFaces(child),
				),
			)
		: [];

const sizeOf = (value: unknown): ReadonlyArray<unknown> => {
	if (typeof value === "number") return [value];
	if (typeof value === "string") return [/^\d+pt$/u.test(value) ? Number(value.slice(0, -2)) : value];
	const literal = valueAt(valueAt(valueAt(value, "expr"), "Literal"), "Value");
	if (typeof literal !== "string") return [];
	return [/^-?\d+(?:\.\d+)?[DL]$/u.test(literal) ? Number(literal.slice(0, -1)) : literal];
};

const fontSizes = (value: unknown): ReadonlyArray<unknown> =>
	typeof value === "object" && value !== null
		? Object.entries(value).flatMap(([key, child]) =>
				(isFontSizeKey(key) ? sizeOf(child) : []).concat(fontSizes(child)),
			)
		: [];

const checkFonts = (config: Config): ReadonlyArray<string> => {
	const registered = new Set(config.report.fonts ?? []);
	const sources: ReadonlyArray<readonly [string, unknown]> = [
		["report", config.report.definition],
		...config.report.pages.flatMap((page) => {
			const { visuals, ...rest } = page;
			return [
				[`page "${page.name}"`, rest] as const,
				...visuals.map((visual) => [`page "${page.name}" visual "${visual.name}"`, visual] as const),
			];
		}),
		...(config.report.bookmarks?.items ?? []).map((item) => [`bookmark "${item.name}"`, item] as const),
		...(config.report.resources ?? []).flatMap((resource) =>
			resource.kind === "baseTheme" || resource.kind === "customTheme"
				? [[resourceLabel(resource), resource.theme] as const]
				: [],
		),
	];
	const families = [...registered]
		.filter((family) => !isFamilyName(family))
		.map((family) => `report.fonts: "${family}" must be one font family name, without commas or quotes`);
	return families.concat(
		sources.flatMap(([where, value]) =>
			[...new Set(fontFaces(value))]
				.filter((face) => !isBuiltinFont(face) && !registered.has(face))
				.map(
					(face) =>
						`${where}: font "${face}" is not a Power BI font, add it to report.fonts and to the Register`,
				)
				.concat(
					[...new Set(fontSizes(value))]
						.filter((size) => !isFontSize(size))
						.map(
							(size) =>
								`${where}: font size ${JSON.stringify(size)} must be a whole number from ${MIN_FONT_SIZE} to ${MAX_FONT_SIZE}`,
						),
				),
		),
	);
};

const datasetIssues = (config: Config): ReadonlyArray<string> => {
	const connected = config.report.pbir.datasetReference !== undefined;
	if (config.model === undefined && !connected)
		return [
			"report: set model for a local semantic model, or report.pbir.datasetReference.byConnection for a published one",
		];
	if (config.model !== undefined && connected)
		return ["report: use either model or report.pbir.datasetReference.byConnection, not both"];
	return [];
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
	const resourceIssues = checkResources(config);
	const errors = [
		...pathIssue("config", config.name),
		...(config.out === undefined || config.out.trim() !== "" ? [] : ["config: out must not be empty"]),
		...sourceIssues(config),
		...resourceIssues.errors,
		...checkFonts(config),
		...duplicates(pageNames).map((name) => `report: page name "${name}" is used more than once`),
		...duplicates(bindings).map((name) => `report: pageBinding name "${name}" is used more than once`),
		...Object.entries(pageRefs).flatMap(([key, name]) =>
			name === undefined || pageNames.includes(name)
				? []
				: [`report: ${key} "${name}" is not a page in this report`],
		),
		...(config.model === undefined || insideProject(config.model.path)
			? []
			: [
					`model: path "${config.model.path}" must be a relative path inside the project, with "/" as the separator`,
				]),
		...datasetIssues(config),
		...pages.flatMap((page) => checkPage(page)),
		...duplicates([...bookmarks, ...groups].map((item) => item.name)).map(
			(name) => `report: bookmark name "${name}" is used more than once`,
		),
		...bookmarks.flatMap((bookmark) => nameIssue(`bookmark "${bookmark.name}"`, bookmark.name)),
		...groups.flatMap((group) => nameIssue(`bookmark group "${group.name}"`, group.name)),
	];
	const warnings = [
		...resourceIssues.warnings,
		...visualTypeIssues(config),
		...bookmarks.flatMap((bookmark) => checkBookmark(bookmark, visualsByPage)),
		...pages.flatMap((page) =>
			page.visuals.flatMap((visual) =>
				expansionIssues(
					`page "${page.name}" visual "${visual.name}"`,
					visual,
					valueAt(valueAt(visual, "visual"), "expansionStates"),
				),
			),
		),
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
