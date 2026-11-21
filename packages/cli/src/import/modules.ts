import { posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { Array as Arr, HashMap, Option } from "effect";
import { Literal, String as StringSchema, Struct, decodeUnknownOption } from "effect/Schema";

import { isRaw } from "@pbirkit/core/config";
import type { Config } from "@pbirkit/core/config";
import { imageRef } from "@pbirkit/core/expr";
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
	[Layout.pages, "pages"],
	[Layout.bookmarks, "bookmarks"],
]);
const encoder = new TextEncoder();

type Report = Config["report"];
type Page = Report["pages"][number];
type Resource = NonNullable<Report["resources"]>[number];

export interface ImportFiles {
	readonly files: ReadonlyArray<TreeFile>;
	readonly folders: ReadonlyArray<string>;
}

interface Module {
	readonly file: string;
	readonly value: unknown;
	readonly swaps: boolean;
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

const identifierOf = (file: string): string => {
	const shared = SHARED_MODULES.get(file);
	if (shared !== undefined) return shared;

	const name = posix.basename(file, ".ts");
	const key = keyOf(wordsOf(name === Layout.indexName ? posix.basename(posix.dirname(file)) : name));

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
		const base = identifierOf(target);
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
			Url: ({ url }) =>
				`new URL(${JSON.stringify(`${urlPath(relativeTo(file, assetOf(url)))}${isFolder(url) ? "/" : ""}`)}, import.meta.url)`,
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

	const tree = toNode(value, idiomatic, { ...swaps, nameOf: importName });
	const used = [...new Set(helperNames(tree))].toSorted();
	const isConfig = file === Layout.config;
	const body = render(tree, 0);
	const lines = [
		...(isConfig ? ['import { defineConfig } from "@pbirkit/core/config";'] : []),
		...(used.length === 0 ? [] : [`import { ${used.join(", ")} } from "@pbirkit/core/expr";`]),
		...Array.from(
			imports,
			([target, name]) => `import ${name} from ${JSON.stringify(urlPath(relativeTo(file, target)))};`,
		),
	];
	return [
		...(lines.length === 0 ? [] : [...lines, ""]),
		...(header === "" ? [] : [header, ""]),
		isConfig ? `export default defineConfig(${body});` : `export default ${body} as const;`,
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

const projectModules = (
	config: Config,
	names: Names,
): {
	readonly modules: ReadonlyArray<Module>;
	readonly root: unknown;
	readonly images: ReadonlyMap<string, string>;
	readonly located: Located;
} => {
	const modules: Array<Module> = [];
	const images = new Map<string, string>();
	const located = new Map<unknown, string>();
	const themeName = nameScope();
	const imageName = nameScope();
	const add = (file: string, value: unknown, swaps = true) => {
		modules.push({ file, value, swaps });
		located.set(value, file);
		return new ModuleReference(file);
	};

	const pageModule = (page: Page) => {
		const folder = names.pages.get(page.name)?.file ?? fileName(page.name, "page");
		const own = names.visuals.get(page.name);
		const visualFile = (name: string) =>
			Layout.visual(folder, own?.get(name)?.file ?? fileName(name, "visual"));

		const visuals = page.visuals.map((visual) => {
			if (isRaw(visual)) return visual;

			const file = visualFile(visual.name);
			located.set(visual, file);
			return add(file, visual);
		});

		const file = Layout.page(folder);
		located.set(page, file);
		return add(file, { ...page, visuals });
	};

	const bookmark = <A extends { readonly name: string }>(item: A) =>
		isRaw(item)
			? item
			: add(Layout.bookmark(names.bookmarks.get(item.name)?.file ?? fileName(item.name, "bookmark")), item);

	const resourceModule = (resource: Resource): unknown => {
		if ("theme" in resource) {
			const file = Layout.theme(themeName(wordsOf(posix.basename(resource.name, ".json"))).file);
			return { ...resource, theme: add(file, resource.theme, false) };
		}
		if (resource.kind !== "image") return resource;

		const words = wordsOf(posix.basename(resource.name, posix.extname(resource.name)));
		const file = Layout.image(imageName(words.length > 0 ? words : ["image"]).file);
		images.set(resource.name, file);
		return add(file, resource, false);
	};

	const { bookmarks, pages, resources } = config.report;
	const pageList = add(
		Layout.pages,
		pages.map((page) => pageModule(page)),
	);
	const bookmarkItems = bookmarks?.items.map((item) =>
		"children" in item
			? { name: item.name, displayName: item.displayName, children: item.children.map(bookmark) }
			: bookmark(item),
	);
	const report = {
		...config.report,
		pages: pageList,
		...(bookmarks === undefined || bookmarkItems === undefined
			? {}
			: { bookmarks: { ...bookmarks, items: add(Layout.bookmarks, bookmarkItems) } }),
		...(resources === undefined ? {} : { resources: resources.map((resource) => resourceModule(resource)) }),
	};

	return { modules, root: { ...config, report }, images, located };
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

export const swapsOf = (
	ids: Ids,
	images: ReadonlyMap<string, string>,
	colors: (color: string) => string,
	idiomatic: boolean,
): ModuleSwaps => {
	const idMember = (value: string) =>
		Option.map(Option.fromUndefinedOr(ids.paths.get(value)), (path) => new ModuleMember(Layout.ids, path));

	const imageCall = (value: unknown) =>
		ImageItem(value).pipe(
			Option.map(({ ResourcePackageItem }) => ResourcePackageItem.ItemName),
			Option.filter((name) => JSON.stringify(imageRef({ kind: "image", name })) === JSON.stringify(value)),
			Option.flatMap((name) => Option.fromUndefinedOr(images.get(name))),
			Option.map((file) => new HelperCall("imageRef", [new ModuleMember(file, [])])),
		);

	return {
		swapKey: idMember,
		swap: (value, helper) => {
			if (typeof value !== "string") return idiomatic ? imageCall(value) : Option.none();

			const member = idMember(value);
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
	[Layout.packageJson]: { type: "module" },
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
	const { modules, root, images, located } = projectModules(config, names);
	const ids = idsOf(index, names);
	const roles = colorRoles(themesOf(config));
	const used = new Set<string>();
	const colorOf = (color: string) => {
		used.add(color);
		return colorName(roles, color);
	};
	const swaps = swapsOf(ids, images, colorOf, idiomatic);
	const render = (file: string, value: unknown, options: Parameters<typeof renderModule>[3] = {}) =>
		treeFile(file, encoder.encode(renderModule(file, value, assetOf, { idiomatic, ...options })));

	const rendered = [
		...modules.map((module) => render(module.file, module.value, module.swaps ? { swaps } : {})),
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
