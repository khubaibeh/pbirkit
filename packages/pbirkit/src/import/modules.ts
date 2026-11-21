import { posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { Array as Arr, HashMap, Option, Predicate } from "effect";
import { Literal, String as StringSchema, Struct, decodeUnknownOption } from "effect/Schema";

import { isRaw } from "@pbirkit/core/config";
import type { Config } from "@pbirkit/core/config";
import { at, imageRef } from "@pbirkit/core/expr";
import { SchemaUrl } from "@pbirkit/core/schemas/schema-url";
import type { ReportTree } from "@pbirkit/core/tree";
import { isBuiltinVisual } from "@pbirkit/core/visual-type";

import { fileKey, treeFile } from "../build/tree.ts";
import type { TreeFile } from "../build/tree.ts";
import { Layout } from "../layout.ts";
import type { Project } from "../pbip/project.ts";
import { fileJson } from "../pbip/tree.ts";
import type { Fallback } from "./draft.ts";
import {
	colorName,
	colorRoles,
	fileOf,
	idsOf,
	isColor,
	keyOf,
	nameScope,
	namesOf,
	wordsOf,
} from "./names.ts";
import type { Ids, Names } from "./names.ts";
import {
	HelperCall,
	LINE_WIDTH,
	ModuleMember,
	ModuleReference,
	NO_SWAPS,
	Node,
	helperNames,
	memberPath,
	toNode,
} from "./nodes.ts";
import type { Swaps } from "./nodes.ts";
import { importReport } from "./report.ts";

const SHARED_MODULES: ReadonlyMap<string, string> = new Map([
	[Layout.ids, "ids"],
	[Layout.palette, "palette"],
	[Layout.resources, "resources"],
	[Layout.pages, "pages"],
	[Layout.bookmarks, "bookmarks"],
]);
const SCHEMA_URL = "@pbirkit/core/schemas/schema-url";
const PACKAGE_EXPORTS: ReadonlyMap<string, string> = new Map([[SCHEMA_URL, "SchemaUrl"]]);
const SCHEMA_PATHS: ReadonlyMap<string, ReadonlyArray<string>> = new Map(
	Object.entries(SchemaUrl).flatMap(([kind, versions]) =>
		Object.entries(versions).map(([version, url]) => [url, [kind, version]] as const),
	),
);
const DEFINERS: ReadonlyMap<string, string> = new Map([
	["visual", "defineVisual"],
	["page", "definePage"],
	["bookmark", "defineBookmark"],
]);
const CONFIG_DEFINER = { name: "defineConfig", from: "@pbirkit/core/config" };
const encoder = new TextEncoder();

type Report = Config["report"];
type Page = Report["pages"][number];
type Resource = NonNullable<Report["resources"]>[number];
type Visual = Page["visuals"][number];

export interface ImportFiles {
	readonly files: ReadonlyArray<TreeFile>;
	readonly folders: ReadonlyArray<string>;
}

interface Module {
	readonly file: string;
	readonly value: unknown;
	readonly swaps: boolean;
	readonly links: boolean;
}

export type Located = ReadonlyMap<unknown, string>;

type ModuleSwaps = Omit<Swaps, "nameOf">;

const block = (depth: number, open: string, items: ReadonlyArray<string>, close: string) =>
	items.length === 0
		? `${open}${close}`
		: `${open}\n${items.map((entry) => `${"\t".repeat(depth + 1)}${entry},\n`).join("")}${"\t".repeat(depth)}${close}`;

const urlPath = (path: string): string =>
	path
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/");

const relativeTo = (file: string, target: string): string => {
	const path = posix.relative(posix.dirname(file), target);
	return path.startsWith("../") ? path : `./${path}`;
};

const isSource = (path: string): boolean => !posix.relative(Layout.sources, path).startsWith("../");

const specifierOf = (file: string, target: string): string => {
	const path = relativeTo(file, target);
	const aliased = isSource(target) && (!isSource(file) || path.startsWith("../"));

	return aliased ? `${Layout.alias}${urlPath(posix.relative(Layout.sources, target))}` : urlPath(path);
};

const identifierOf = (file: string): string => {
	const shared = SHARED_MODULES.get(file) ?? PACKAGE_EXPORTS.get(file);
	if (shared !== undefined) return shared;

	const name = posix.basename(file, ".ts");
	const key = keyOf(wordsOf(name === Layout.indexName ? posix.basename(posix.dirname(file)) : name));

	return key.startsWith("_") ? key : `_${key === "" ? "module" : key}`;
};

const qualifiedIdentifierOf = (file: string): string => {
	const parts = posix
		.relative(Layout.sources, file)
		.replace(/\.ts$/u, "")
		.split("/")
		.slice(1)
		.filter((part) => part !== Layout.visualsFolder && part !== Layout.indexName);
	const key = keyOf(parts.flatMap((part) => wordsOf(part)));

	return key.startsWith("_") ? key : `_${key === "" ? "module" : key}`;
};

const fileName = (text: string, fallback: string): string => {
	const words = wordsOf(text);
	return fileOf(words.length === 0 ? [fallback] : words);
};

const assetPath = (project: Project, path: string): string => {
	const under = (folder: string | undefined) =>
		folder !== undefined && fileKey(path).startsWith(fileKey(`${folder}/`))
			? path.slice(folder.length + 1)
			: undefined;
	const report = under(project.report);
	if (report !== undefined) return Layout.staticFile(report);

	const model = under(project.model);
	return model === undefined ? Layout.staticFile(path) : Layout.modelFile(model);
};

const projectPath = (project: Project, url: URL): string =>
	relative(project.root, fileURLToPath(url)).split(sep).join("/");

const isFolder = (url: URL): boolean => url.pathname.endsWith("/");

const isResolvable = (part: string): boolean =>
	part !== "" &&
	part !== "." &&
	part !== ".." &&
	part.toLowerCase() !== "node_modules" &&
	!part.includes("\\");

const urlText = (file: string, asset: string, folder: boolean): string => {
	const inside = posix.relative(Layout.staticFolder, asset);
	const aliased = !inside.startsWith("../") && inside.split("/").every((part) => isResolvable(part));
	if (!aliased)
		return `new URL(${JSON.stringify(`${urlPath(relativeTo(file, asset))}${folder ? "/" : ""}`)}, import.meta.url)`;

	const resolved = `import.meta.resolve(${JSON.stringify(`${Layout.staticAlias}${urlPath(inside)}`)})`;
	return folder ? `new URL(\`\${${resolved}}/\`)` : `new URL(${resolved})`;
};

interface Definer {
	readonly name: string;
	readonly from: string;
}

const definerOf = (value: unknown): { readonly definer: Definer; readonly value: unknown } | undefined => {
	if (!Predicate.isReadonlyObject(value) || Array.isArray(value)) return undefined;

	const [first, ...rest] = Object.entries(value);
	const schema =
		first?.[0] === "$schema" && typeof first[1] === "string" ? SCHEMA_PATHS.get(first[1]) : undefined;
	const [kind = "", version = ""] = schema ?? [];
	const name = DEFINERS.get(kind);
	if (name === undefined) return undefined;

	return {
		definer: { name, from: `@pbirkit/core/schemas/${kind}/${version}` },
		value: Object.fromEntries(rest),
	};
};

export const renderModule = (
	file: string,
	value: unknown,
	assetOf: (url: URL) => string,
	{
		header = "",
		idiomatic = false,
		swaps = NO_SWAPS,
	}: { readonly header?: string; readonly idiomatic?: boolean; readonly swaps?: ModuleSwaps } = {},
): string => {
	const imports = new Map<string, string>();
	const names = new Set<string>();
	const importName = (target: string): string => {
		const known = imports.get(target);
		if (known !== undefined) return known;
		const short = identifierOf(target);
		const base = names.has(short) ? qualifiedIdentifierOf(target) : short;
		let name = base;
		for (let suffix = 2; names.has(name); suffix += 1) name = `${base}_${suffix}`;
		names.add(name);
		imports.set(target, name);
		return name;
	};

	const hugged = (name: string, args: ReadonlyArray<Node>, depth: number): Option.Option<string> =>
		Option.all({
			head: Option.all(Arr.dropRight(args, 1).map(({ line }) => line)),
			last: Option.filter(Arr.last(args), (node) => Node.$is("List")(node) || Node.$is("Fields")(node)),
		}).pipe(
			Option.map(({ head, last }) => ({ open: `${name}(${head.map((part) => `${part}, `).join("")}`, last })),
			Option.filter(({ open }) => open.length + 1 <= LINE_WIDTH),
			Option.map(({ open, last }) => `${open}${expanded(last, depth)})`),
		);

	const render = (node: Node, depth: number): string =>
		Option.getOrElse(node.line, () => expanded(node, depth));

	const expanded = (node: Node, depth: number): string =>
		Node.$match(node, {
			Scalar: ({ text }) => text,
			Module: ({ file: target }) => importName(target),
			Member: ({ file: target, path }) => `${importName(target)}${memberPath(path)}`,
			Url: ({ url }) => urlText(file, assetOf(url), isFolder(url)),
			Constant: ({ name }) => name,
			Call: ({ name, args }) =>
				Option.getOrElse(hugged(name, args, depth), () =>
					block(
						depth,
						`${name}(`,
						args.map((arg) => render(arg, depth + 1)),
						")",
					),
				),
			List: ({ items }) =>
				block(
					depth,
					"[",
					items.map((item) => render(item, depth + 1)),
					"]",
				),
			Fields: ({ entries }) =>
				block(
					depth,
					"{",
					entries.map(([key, item]) => `${key}: ${render(item, depth + 1)}`),
					"}",
				),
		});

	const defined = file === Layout.config ? { definer: CONFIG_DEFINER, value } : definerOf(value);
	const tree = toNode(defined?.value ?? value, idiomatic, { ...swaps, nameOf: importName });
	const used = [...new Set(helperNames(tree))].toSorted();
	const body = render(tree, 0);
	const lines = [
		...(defined === undefined ? [] : [`import { ${defined.definer.name} } from "${defined.definer.from}";`]),
		...(used.length === 0 ? [] : [`import { ${used.join(", ")} } from "@pbirkit/core/expr";`]),
		...Array.from(imports, ([target, name]) =>
			PACKAGE_EXPORTS.has(target)
				? `import { ${name} } from ${JSON.stringify(target)};`
				: `import ${name} from ${JSON.stringify(specifierOf(file, target))};`,
		),
	];
	return [
		...(lines.length === 0 ? [] : [...lines, ""]),
		...(header === "" ? [] : [header, ""]),
		defined === undefined
			? `export default ${body} as const;`
			: `export default ${defined.definer.name}(${body});`,
		"",
	].join("\n");
};

export const registerKey = (name: string): string => `import:${name}`;

const registerBlock = (config: Config): string => {
	const guids = new Set(
		(config.report.resources ?? []).flatMap((resource) =>
			resource.kind === "customVisual" ? [resource.guid] : [],
		),
	);
	const types = [
		...new Set(
			config.report.pages.flatMap((page) =>
				page.visuals.flatMap((visual) =>
					!isRaw(visual) && "visual" in visual && !isBuiltinVisual(visual.visual.visualType)
						? [visual.visual.visualType]
						: [],
				),
			),
		),
	].toSorted();
	const visuals = types.filter((type) => guids.has(type));
	const builtinVisuals = types.filter((type) => !guids.has(type));
	const fields = [
		...(visuals.length === 0
			? []
			: [
					`readonly visuals: readonly [${visuals.map((guid) => `{ readonly guid: ${JSON.stringify(guid)} }`).join(", ")}];`,
				]),
		...(builtinVisuals.length === 0
			? []
			: [
					`readonly builtinVisuals: readonly [${builtinVisuals.map((type) => JSON.stringify(type)).join(", ")}];`,
				]),
	];
	return fields.length === 0
		? ""
		: [
				'declare module "@pbirkit/core/register" {',
				"\tinterface Register {",
				`\t\treadonly ${JSON.stringify(registerKey(config.name))}: {`,
				...fields.map((field) => `\t\t\t${field}`),
				"\t\t};",
				"\t}",
				"}",
			].join("\n");
};

const groupTree = (visuals: ReadonlyArray<Visual>) => {
	const names = new Set(visuals.map((visual) => visual.name));
	const groups = new Set(visuals.flatMap((visual) => ("visualGroup" in visual ? [visual.name] : [])));
	const parents = new Map(
		visuals.flatMap((visual) => {
			const parent = "parentGroupName" in visual ? visual.parentGroupName : undefined;
			return typeof parent === "string" ? [[visual.name, parent] as const] : [];
		}),
	);

	const reaches = (from: string, target: string) => {
		const seen = new Set<string>();

		for (
			let step: string | undefined = from;
			step !== undefined && !seen.has(step);
			step = parents.get(step)
		) {
			if (step === target) return true;
			seen.add(step);
		}

		return false;
	};

	const parentOf = (name: string): string | undefined => {
		const parent = parents.get(name);
		return parent !== undefined && groups.has(parent) && !reaches(parent, name) ? parent : undefined;
	};

	const chainOf = (name: string): ReadonlyArray<string> => {
		const chain: Array<string> = [];
		for (let parent = parentOf(name); parent !== undefined; parent = parentOf(parent)) chain.unshift(parent);

		return chain;
	};

	const withChildren = new Set(visuals.flatMap((visual) => parentOf(visual.name) ?? []));

	return { names, parentOf, chainOf, hasChildren: (name: string) => withChildren.has(name) };
};

const projectModules = (
	config: Config,
	names: Names,
): {
	readonly modules: ReadonlyArray<Module>;
	readonly root: unknown;
	readonly images: ReadonlyMap<string, string>;
	readonly located: Located;
	readonly targets: ReadonlyMap<string, string>;
} => {
	const modules: Array<Module> = [];
	const targets = new Map<string, string>();
	const images = new Map<string, string>();
	const imageResources: Record<string, unknown> = {};
	const located = new Map<unknown, string>();
	const pageFiles = new Map<string, string>();
	const themeName = nameScope();
	const imageName = nameScope();
	const add = (file: string, value: unknown, swaps = true, links = false) => {
		modules.push({ file, value, swaps, links });
		located.set(value, file);
		return new ModuleReference(file);
	};

	const pageModule = (page: Page) => {
		const folder = names.pages.get(page.name)?.file ?? fileName(page.name, "page");
		const own = names.visuals.get(page.name);
		const tree = groupTree(page.visuals.filter((visual) => !isRaw(visual)));
		const baseName = (name: string) => own?.get(name)?.file ?? fileName(name, "visual");
		const visualFile = (name: string) => {
			const chain = tree.chainOf(name);
			const folders = chain.slice(0, Layout.groupDepth).map((group) => baseName(group));
			const foldered = tree.hasChildren(name) && chain.length < Layout.groupDepth;

			return Layout.visual(folder, [...folders, baseName(name), ...(foldered ? [Layout.indexName] : [])]);
		};
		const modulesOf = tree.names;
		const memberOf = (name: unknown) =>
			typeof name === "string" && modulesOf.has(name) ? new ModuleMember(visualFile(name), ["name"]) : name;

		const withParent = (visual: Visual) => {
			const parent = tree.parentOf(visual.name);
			if (parent === undefined) return visual;

			return { ...visual, parentGroupName: new ModuleMember(visualFile(parent), ["name"]) };
		};

		const visuals = page.visuals.map((visual) => {
			if (isRaw(visual)) return visual;

			const file = visualFile(visual.name);
			located.set(visual, file);
			targets.set(visual.name, file);
			return add(file, withParent(visual));
		});

		const interactions = "visualInteractions" in page ? page.visualInteractions : undefined;
		const linked =
			interactions === undefined
				? {}
				: {
						visualInteractions: interactions.map((entry) =>
							Object.fromEntries(
								Object.entries(entry).map(([key, value]) => [
									key,
									key === "source" || key === "target" ? memberOf(value) : value,
								]),
							),
						),
					};

		const file = Layout.page(folder);
		located.set(page, file);
		pageFiles.set(page.name, file);
		targets.set(page.name, file);
		return add(file, { ...page, visuals, ...linked });
	};

	const bookmark = <A extends { readonly name: string }>(item: A) =>
		isRaw(item)
			? item
			: add(
					Layout.bookmark(names.bookmarks.get(item.name)?.file ?? fileName(item.name, "bookmark")),
					item,
					true,
					true,
				);

	const resourceModule = (resource: Resource): unknown => {
		if ("theme" in resource) {
			const file = Layout.theme(themeName(wordsOf(posix.basename(resource.name, ".json"))).file);
			return { ...resource, theme: add(file, resource.theme, false) };
		}
		if (resource.kind !== "image") return resource;

		const words = wordsOf(posix.basename(resource.name, posix.extname(resource.name)));
		const { key } = imageName(words.length > 0 ? words : ["image"]);
		images.set(resource.name, key);
		imageResources[key] = resource;
		return new ModuleMember(Layout.resources, [key]);
	};

	const { bookmarks, pages, pagesMetadata, resources } = config.report;
	const pageList = add(
		Layout.pages,
		pages.map((page) => pageModule(page)),
	);
	const metadata = pagesMetadata instanceof URL ? undefined : pagesMetadata;
	const active = at(metadata, "activePageName");
	const activeFile = typeof active === "string" ? pageFiles.get(active) : undefined;
	const bookmarkItems = bookmarks?.items.map((item) =>
		"children" in item
			? { name: item.name, displayName: item.displayName, children: item.children.map(bookmark) }
			: bookmark(item),
	);
	const report = {
		...config.report,
		pages: pageList,
		...(activeFile === undefined
			? {}
			: { pagesMetadata: { ...metadata, activePageName: new ModuleMember(activeFile, ["name"]) } }),
		...(bookmarks === undefined || bookmarkItems === undefined
			? {}
			: { bookmarks: { ...bookmarks, items: add(Layout.bookmarks, bookmarkItems) } }),
		...(resources === undefined ? {} : { resources: resources.map((resource) => resourceModule(resource)) }),
	};
	if (Object.keys(imageResources).length > 0) add(Layout.resources, imageResources, false);

	return { modules, root: { ...config, report }, images, located, targets };
};

const ImageItem = decodeUnknownOption(
	Struct({
		ResourcePackageItem: Struct({
			PackageName: Literal("RegisteredResources"),
			PackageType: Literal(1),
			ItemName: StringSchema,
		}),
	}),
	{ onExcessProperty: "error" },
);

const schemaMember = (value: string) =>
	Option.map(Option.fromUndefinedOr(SCHEMA_PATHS.get(value)), (path) => new ModuleMember(SCHEMA_URL, path));

export const swapsOf = (
	ids: Ids,
	images: ReadonlyMap<string, string>,
	colors: (color: string) => string,
	idiomatic: boolean,
	targets: ReadonlyMap<string, string> = new Map(),
): ModuleSwaps => {
	const idMember = (value: string) =>
		Option.map(Option.fromUndefinedOr(ids.paths.get(value)), (path) => {
			const target = targets.get(value);
			return target === undefined ? new ModuleMember(Layout.ids, path) : new ModuleMember(target, ["name"]);
		});

	const imageCall = (value: unknown) =>
		ImageItem(value).pipe(
			Option.map(({ ResourcePackageItem }) => ResourcePackageItem.ItemName),
			Option.filter((name) => JSON.stringify(imageRef({ kind: "image", name })) === JSON.stringify(value)),
			Option.flatMap((name) => Option.fromUndefinedOr(images.get(name))),
			Option.map((key) => new HelperCall("imageRef", [new ModuleMember(Layout.resources, [key])])),
		);

	return {
		swapKey: idMember,
		swap: (value, helper) => {
			if (typeof value !== "string") return idiomatic ? imageCall(value) : Option.none();

			const member = Option.orElse(idMember(value), () => schemaMember(value));
			if (Option.isSome(member) || !idiomatic || helper !== "solid" || !isColor(value)) return member;

			return Option.some(new ModuleMember(Layout.palette, [colors(value)]));
		},
	};
};

const themesOf = (config: Config): ReadonlyArray<unknown> => {
	const resources = config.report.resources ?? [];

	return ["customTheme", "builtInTheme", "baseTheme"].flatMap((kind) =>
		resources.flatMap((resource) => (resource.kind === kind && "theme" in resource ? [resource.theme] : [])),
	);
};

const paletteOf = (roles: ReadonlyMap<string, string>, used: ReadonlySet<string>) => {
	const named = [...roles].filter(([color]) => used.has(color));
	const unnamed = [...used].filter((color) => !roles.has(color)).toSorted();

	return Object.fromEntries([
		...named.map(([color, name]) => [name, color] as const),
		...unnamed.map((color) => [colorName(roles, color), color] as const),
	]);
};

const urlsIn = (value: unknown): ReadonlyArray<URL> =>
	value instanceof URL
		? [value]
		: typeof value === "object" && value !== null
			? Object.values(value).flatMap((item) => urlsIn(item))
			: [];

const SUPPORT_FILES = {
	[Layout.packageJson]: { type: "module", imports: Layout.aliases },
	[Layout.tsconfig]: {
		extends: `./${Layout.localTsconfig}`,
		compilerOptions: {
			target: "ES2024",
			module: "NodeNext",
			strict: true,
			noEmit: true,
			allowImportingTsExtensions: true,
			skipLibCheck: true,
		},
		include: [Layout.config, Layout.sources],
	},
};

export const supportFiles = (): ReadonlyArray<TreeFile> => [
	treeFile(Layout.gitignore, encoder.encode(`${Layout.localFolder}/\n`)),
	...Object.entries(SUPPORT_FILES).map(([path, value]) =>
		treeFile(path, encoder.encode(`${JSON.stringify(value, null, "\t")}\n`)),
	),
];

export const importFiles = (
	project: Project,
	index: ReportTree,
	config: Config,
	fallbacks: ReadonlyArray<Fallback>,
	idiomatic: boolean,
): ImportFiles => {
	const assetOf = (url: URL) => assetPath(project, projectPath(project, url));
	const names = namesOf(index, (path) => fileJson(project.tree, path));
	const { modules, root, images, located, targets } = projectModules(config, names);
	const ids = idsOf(index, names);
	const roles = colorRoles(themesOf(config));
	const used = new Set<string>();
	const colorOf = (color: string) => {
		used.add(color);
		return colorName(roles, color);
	};
	const swaps = swapsOf(ids, images, colorOf, idiomatic);
	const linkSwaps = swapsOf(ids, images, colorOf, idiomatic, targets);
	const render = (file: string, value: unknown, options: Parameters<typeof renderModule>[3] = {}) =>
		treeFile(file, encoder.encode(renderModule(file, value, assetOf, { idiomatic, ...options })));

	const rendered = [
		...modules.map((module) =>
			render(module.file, module.value, module.swaps ? { swaps: module.links ? linkSwaps : swaps } : {}),
		),
		render(Layout.config, root, { header: registerBlock(config), swaps }),
	];
	const shared = [
		...(ids.paths.size === 0 ? [] : [render(Layout.ids, ids.value)]),
		...(used.size === 0 ? [] : [render(Layout.palette, paletteOf(roles, used))]),
		treeFile(Layout.report, encoder.encode(importReport({ config, index, fallbacks, ids, located }))),
	];

	const sources = Array.from(HashMap.values(project.tree));
	const urls = urlsIn(config);
	const assets = urls.flatMap((url) => {
		const path = projectPath(project, url);
		const inside = isFolder(url)
			? sources.filter((file) => fileKey(file.path).startsWith(fileKey(`${path}/`)))
			: sources.filter((file) => fileKey(file.path) === fileKey(path));
		return inside.map((file) => ({
			path: assetPath(project, file.path),
			bytes: file.bytes,
			hash: file.hash,
		}));
	});

	return {
		files: [...rendered, ...shared, ...assets],
		folders: urls.filter((url) => isFolder(url)).map((url) => assetPath(project, projectPath(project, url))),
	};
};
