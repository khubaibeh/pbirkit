import type { VisualContainerGroupState } from "#schemas/bookmark/shared.ts";
import { isRaw } from "#schemas/common/raw.ts";
import type { RawItem } from "#schemas/common/raw.ts";

import { insideProject, withoutDot } from "./build/shared.ts";
import type { Config } from "./config.ts";
import { textOf } from "./expr/literal.ts";
import { at as valueAt } from "./expr/query.ts";
import {
	MAX_FONT_SIZE,
	MIN_FONT_SIZE,
	fontFamilies,
	isFamilyName,
	isFontKey,
	isFontSize,
	isFontSizeKey,
	registeredFamilies,
	unknownFamilies,
} from "./font.ts";
import { nameProblems } from "./name.ts";
import { packageItem, samePackageItem } from "./resource.ts";
import type { Resource } from "./resource.ts";
import { themeCatalogIssues, visualCatalogIssues } from "./visual-catalog/index.ts";
import { isBuiltinVisual } from "./visual-type.ts";

type Page = Config["report"]["pages"][number];
type Visual = Page["visuals"][number];
type TypedVisual = Exclude<Visual, RawItem>;
type BookmarkItem = NonNullable<Config["report"]["bookmarks"]>["items"][number];
type BookmarkEntry = Exclude<BookmarkItem, { readonly children: unknown }>;
type Bookmark = Exclude<BookmarkEntry, RawItem>;
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

const nameIssue = (where: string, name: string): ReadonlyArray<string> =>
	nameProblems(name).map((problem) => `${where}: name "${name}" ${problem}`);

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => [
	...new Set(names.filter((name, index) => names.indexOf(name) !== index)),
];

const typedVisuals = (page: Page): ReadonlyArray<TypedVisual> =>
	page.visuals.filter((visual): visual is TypedVisual => !isRaw(visual));

const parentOf = (visual: Visual, byName: ReadonlyMap<string, Visual>): Visual | undefined =>
	isRaw(visual) || visual.parentGroupName === undefined ? undefined : byName.get(visual.parentGroupName);

const inGroupCycle = (start: Visual, byName: ReadonlyMap<string, Visual>): boolean => {
	const seen = new Set<string>();
	let current = parentOf(start, byName);
	while (current !== undefined && !seen.has(current.name)) {
		if (current.name === start.name) return true;
		seen.add(current.name);
		current = parentOf(current, byName);
	}
	return false;
};

const parentIssue = (visual: TypedVisual, byName: ReadonlyMap<string, Visual>): string | undefined => {
	if (visual.parentGroupName === undefined) return undefined;
	const parent = byName.get(visual.parentGroupName);
	if (parent === undefined) return `parentGroupName "${visual.parentGroupName}" is not a visual on this page`;
	if (isRaw(parent)) return undefined;
	if (!("visualGroup" in parent)) return `parentGroupName "${visual.parentGroupName}" is not a group`;
	return inGroupCycle(visual, byName) ? "parent groups form a cycle" : undefined;
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
		const parent = isRaw(visual) ? undefined : parentIssue(visual, byName);
		if (parent !== undefined) issues.push(`${at}: ${parent}`);
	}
	const interactions = isRaw(page) ? [] : (page.visualInteractions ?? []);
	for (const [index, interaction] of interactions.entries())
		for (const end of ["source", "target"] as const)
			if (!byName.has(interaction[end]))
				issues.push(
					`${where} visualInteractions[${index}]: ${end} "${interaction[end]}" is not a visual on this page`,
				);
	return issues;
};

const textLiteral = (value: unknown): string | undefined => textOf(valueAt(value, "expr"));

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
						return visual === undefined || (!isRaw(visual) && !("visualGroup" in visual));
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

const customVisualTypes = (config: Config): ReadonlySet<string> | undefined => {
	const { definition, resources } = config.report;
	if (definition instanceof URL) return undefined;
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
	if (custom === undefined) return [];

	return config.report.pages.flatMap((page) =>
		typedVisuals(page).flatMap((visual) => {
			const type = "visual" in visual ? visual.visual?.visualType : undefined;

			return type === undefined || isBuiltinVisual(type) || custom.has(type)
				? []
				: [
						`page "${page.name}" visual "${visual.name}": visualType "${type}" is not a Power BI visual or a custom visual listed in the report`,
					];
		}),
	);
};

const catalogIssues = (config: Config): ReadonlyArray<string> => [
	...config.report.pages.flatMap((page) =>
		typedVisuals(page).flatMap((visual) =>
			visualCatalogIssues(valueAt(visual, "visual")).map(
				(issue) => `page "${page.name}" visual "${visual.name}": ${issue}`,
			),
		),
	),
	...(config.report.resources ?? []).flatMap((resource) =>
		resource.kind === "customTheme"
			? themeCatalogIssues(valueAt(resource.theme, "visualStyles")).map(
					(issue) => `${resourceLabel(resource)}: ${issue}`,
				)
			: [],
	),
];

const rawEntries = (owner: "model" | "report", files: { readonly [path: string]: URL } = {}) =>
	Object.entries(files).map(([path, url]) => ({ where: `${owner}: files "${path}"`, owner, path, url }));

const ownedIssues = (config: Config): ReadonlyArray<string> =>
	[
		...(config.model?.desktopOwned ?? []).map((path) => ["model", path] as const),
		...(config.report.desktopOwned ?? []).map((path) => ["report", path] as const),
	]
		.filter(([, path]) => !insideProject(path))
		.map(
			([owner, path]) =>
				`${owner}: desktopOwned "${path}": path must be a relative path inside the ${owner} folder, with "/" as the separator`,
		);

const fileOf = (value: unknown): URL | undefined => (value instanceof URL ? value : undefined);

const rawFileSources = (config: Config): ReadonlyArray<readonly [string, URL | undefined]> => {
	const { model, report } = config;
	const bookmarks = report.bookmarks?.items ?? [];
	return [
		["pbip", fileOf(config.pbip)],
		["report: platform", fileOf(report.platform)],
		["report: pbir", fileOf(report.pbir)],
		["report: definition", fileOf(report.definition)],
		["report: version", fileOf(report.version)],
		["report: pagesMetadata", fileOf(report.pagesMetadata)],
		[
			"report: bookmarks",
			report.bookmarks !== undefined && isRaw(report.bookmarks) ? report.bookmarks.file : undefined,
		],
		["model: platform", fileOf(model?.platform)],
		["model: pbism", fileOf(model?.pbism)],
		...report.pages.flatMap((page) =>
			[page, ...page.visuals].flatMap((item) =>
				isRaw(item) ? [[`page "${page.name}" "${item.name}": file`, item.file] as const] : [],
			),
		),
		...bookmarks
			.flatMap((item) => ("children" in item ? item.children : [item]))
			.flatMap((item) => (isRaw(item) ? [[`bookmark "${item.name}": file`, item.file] as const] : [])),
	];
};

const sourceIssues = (config: Config): ReadonlyArray<string> => {
	const { model } = config;
	const raw = [...rawEntries("model", model?.files), ...rawEntries("report", config.report.files)];
	const sources: ReadonlyArray<readonly [string, URL | undefined]> = [
		...rawFileSources(config),
		["model: definition", model?.definition],
		["model: diagramLayout", model?.diagramLayout],
		["model: daxQueries", model?.daxQueries],
		["model: tmdlScripts", model?.tmdlScripts],
		["model: unappliedChanges", model?.unappliedChanges],
		["model: cache", model?.cache],
		["report: semanticModelDiagramLayout", config.report.semanticModelDiagramLayout],
		...raw.map(({ where, url }) => [where, url] as const),
		...(config.report.resources ?? []).flatMap((resource) =>
			resource.kind === "image" ? [[`${resourceLabel(resource)}: file`, resource.file] as const] : [],
		),
	];
	return sources
		.flatMap(([where, url]) =>
			url === undefined || url.protocol === "file:" ? [] : [`${where} "${url.href}" must be a file: URL`],
		)
		.concat(
			raw
				.filter(({ path }) => !insideProject(path))
				.map(
					({ where, owner }) =>
						`${where}: path must be a relative path inside the ${owner} folder, with "/" as the separator`,
				),
		);
};

const packageEntries = (definition: Exclude<Config["report"]["definition"], URL>) =>
	(definition.resourcePackages ?? []).flatMap((pkg) =>
		pkg.items.map((item) => ({ package: pkg.name, type: pkg.type, item })),
	);

const providedByFiles = (
	files: { readonly [path: string]: URL },
	entry: ReturnType<typeof packageEntries>[number],
): boolean => {
	const paths = Object.keys(files).map((path) => withoutDot(path));
	return entry.type === "CustomVisual"
		? paths.some((path) => path.startsWith(`CustomVisuals/${entry.package}/`))
		: paths.includes(`StaticResources/${entry.package}/${entry.item.path}`);
};

const checkResources = (config: Config) => {
	const { definition, files = {}, resources } = config.report;
	if (resources === undefined) return { errors: [], warnings: [] };
	const items = resources.map((resource) => packageItem(resource));
	const shapeErrors = [
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
	if (definition instanceof URL) return { errors: shapeErrors, warnings: [] };
	const listed = definition.resourcePackages === undefined ? undefined : packageEntries(definition);
	const known = listed ?? items;
	const errors = shapeErrors.concat(
		listed === undefined
			? []
			: items
					.filter((item) => !listed.some((entry) => samePackageItem(entry, item)))
					.map(
						({ package: name, item }) =>
							`report: resource "${name}/${item.name}" does not match definition.resourcePackages`,
					),
	);
	const unprovided = (listed ?? [])
		.filter(
			(entry) =>
				!items.some((item) => samePackageItem(item, entry)) &&
				!(entry.type === "CustomVisual" && items.some((item) => item.package === entry.package)) &&
				!providedByFiles(files, entry),
		)
		.map(
			({ package: name, item }) =>
				`report: definition.resourcePackages lists "${name}/${item.name}", but no resource or report.files entry provides it`,
		);
	const { baseTheme, customTheme } = definition.themeCollection;
	const themes = (
		[
			["baseTheme", baseTheme, "baseTheme", ["BaseTheme"]],
			["customTheme", customTheme, "customTheme or builtInTheme", ["CustomTheme", "Image"]],
		] as const
	).flatMap(([slot, theme, kinds, types]) =>
		theme === undefined ||
		known.some(
			({ package: name, item }) =>
				name === theme.type && item.name === theme.name && types.some((type) => type === item.type),
		)
			? []
			: [`report: themeCollection ${slot} "${theme.name}" is not a ${kinds} in report.resources`],
	);
	const links = config.report.pages.flatMap((page) =>
		typedVisuals(page).flatMap((visual) =>
			nested(visual, "ResourcePackageItem").flatMap((ref) => {
				const packageName = valueAt(ref, "PackageName");
				const itemName = valueAt(ref, "ItemName");
				return known.some(({ package: name, item }) => name === packageName && item.name === itemName)
					? []
					: [
							`page "${page.name}" visual "${visual.name}": resource "${String(packageName)}/${String(itemName)}" is not in report.resources`,
						];
			}),
		),
	);
	return { errors, warnings: unprovided.concat(themes, links) };
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

const checkFonts = (
	config: Config,
): { readonly errors: ReadonlyArray<string>; readonly warnings: ReadonlyArray<string> } => {
	const fonts = config.report.fonts ?? [];
	const registered = registeredFamilies(fonts);
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
			resource.kind === "baseTheme" || resource.kind === "customTheme" || resource.kind === "builtInTheme"
				? [[resourceLabel(resource), resource.theme] as const]
				: [],
		),
	];
	const families = fonts
		.filter((font) => !fontFamilies(font).every((family) => isFamilyName(family)))
		.map((font) => `report.fonts: "${font}" has an empty or badly quoted font family name`);
	return {
		errors: families.concat(
			sources.flatMap(([where, value]) =>
				[...new Set(fontFaces(value))]
					.flatMap((face) => unknownFamilies(face, registered).map((family) => [face, family] as const))
					.map(([face, family]) =>
						isFamilyName(family)
							? face === family
								? `${where}: font "${face}" is not a Power BI font, add "${family}" to report.fonts and to the Register`
								: `${where}: font "${face}" uses "${family}", which is not a Power BI font, add "${family}" to report.fonts and to the Register`
							: `${where}: font "${face}" has an empty or badly quoted font family name`,
					),
			),
		),
		warnings: sources.flatMap(([where, value]) =>
			[...new Set(fontSizes(value))]
				.filter((size) => !isFontSize(size))
				.map(
					(size) =>
						`${where}: font size ${JSON.stringify(size)} is not a whole number from ${MIN_FONT_SIZE} to ${MAX_FONT_SIZE}`,
				),
		),
	};
};

const datasetIssues = (config: Config): ReadonlyArray<string> => {
	const { pbir } = config.report;
	if (pbir instanceof URL) return [];
	const connected = pbir.datasetReference !== undefined;
	if (config.model === undefined && !connected)
		return [
			"report: set model for a local semantic model, or report.pbir.datasetReference.byConnection for a published one",
		];
	if (config.model !== undefined && connected)
		return ["report: use either model or report.pbir.datasetReference.byConnection, not both"];
	return [];
};

const platformIssues = (config: Config): ReadonlyArray<string> => {
	const { model, report } = config;
	return [
		...(report.platform instanceof URL || report.logicalId !== undefined
			? []
			: ["report: set logicalId, or keep platform as a file"]),
		...(model === undefined ||
		model.platform instanceof URL ||
		(model.name !== undefined && model.logicalId !== undefined)
			? []
			: ["model: set name and logicalId, or keep platform as a file"]),
	];
};

const ignoredFields = (config: Config): ReadonlyArray<string> => {
	const { model, report } = config;
	return [
		...(report.platform instanceof URL && (report.logicalId !== undefined || report.displayName !== undefined)
			? ["report: logicalId and displayName have no effect because platform is a file"]
			: []),
		...(model?.platform instanceof URL && (model.name !== undefined || model.logicalId !== undefined)
			? ["model: name and logicalId have no effect because platform is a file"]
			: []),
		...(report.pagesMetadata instanceof URL
			? [
					"report: pagesMetadata is a file, so that file sets the page order and the active page, not report.pages",
				]
			: []),
		...(report.bookmarks !== undefined && isRaw(report.bookmarks)
			? ["report: bookmarks is a file, so that file sets the bookmark order and groups, not bookmarks.items"]
			: []),
	];
};

const pageRefsOf = (metadata: Config["report"]["pagesMetadata"]) =>
	metadata instanceof URL
		? {}
		: {
				activePageName: metadata.activePageName,
				landingPageName: "landingPageName" in metadata ? metadata.landingPageName : undefined,
			};

export const checkConfig = (config: Config): ConfigIssues => {
	const { pages, pagesMetadata } = config.report;
	const pageNames = pages.map((page) => page.name);
	const bindings = pages.flatMap((page) =>
		"pageBinding" in page && page.pageBinding !== undefined ? [page.pageBinding.name] : [],
	);
	const pageRefs = pageRefsOf(pagesMetadata);
	const items = config.report.bookmarks?.items ?? [];
	const entries = items.flatMap((item): ReadonlyArray<BookmarkEntry> =>
		"children" in item ? item.children : [item],
	);
	const bookmarks = entries.filter((entry): entry is Bookmark => !isRaw(entry));
	const groups = items.flatMap((item) => ("children" in item ? [item] : []));
	const bookmarkNames = new Set(entries.map((bookmark) => bookmark.name));
	const visualsByPage: VisualsByPage = new Map(
		pages.map((page) => [page.name, new Map(page.visuals.map((visual) => [visual.name, visual]))]),
	);
	const resourceIssues = checkResources(config);
	const fontIssues = checkFonts(config);
	const errors = [
		...pathIssue("config", config.name),
		...(config.report.path === undefined || insideProject(config.report.path)
			? []
			: ['report: path must be a relative path inside the project, with "/" as the separator']),
		...(config.out === undefined || config.out.trim() !== "" ? [] : ["config: out must not be empty"]),
		...sourceIssues(config),
		...ownedIssues(config),
		...resourceIssues.errors,
		...fontIssues.errors,
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
		...platformIssues(config),
		...pages.flatMap((page) => checkPage(page)),
		...duplicates([...entries, ...groups].map((item) => item.name)).map(
			(name) => `report: bookmark name "${name}" is used more than once`,
		),
		...entries.flatMap((bookmark) => nameIssue(`bookmark "${bookmark.name}"`, bookmark.name)),
		...groups.flatMap((group) => nameIssue(`bookmark group "${group.name}"`, group.name)),
	];
	const warnings = [
		...resourceIssues.warnings,
		...fontIssues.warnings,
		...ignoredFields(config),
		...visualTypeIssues(config),
		...catalogIssues(config),
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
