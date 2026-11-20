import { posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { Array as Arr, HashMap, Option } from "effect";

import { isRaw } from "@pbirkit/core/config";
import type { Config } from "@pbirkit/core/config";
import { isBuiltinVisual } from "@pbirkit/core/visual-type";

import { LOCAL_TSCONFIG } from "../build/core-types.ts";
import { fileKey, treeFile } from "../build/tree.ts";
import type { TreeFile } from "../build/tree.ts";
import type { Project } from "../pbip/project.ts";
import { LINE_WIDTH, ModuleReference, Node, helperNames, property, toNode } from "./nodes.ts";

export const CONFIG_FILE = "pbirkit.config.ts";

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
}

const encoder = new TextEncoder();

const block = (depth: number, open: string, items: ReadonlyArray<string>, close: string) =>
	items.length === 0
		? `${open}${close}`
		: `${open}\n${items.map((entry) => `${"\t".repeat(depth + 1)}${entry},\n`).join("")}${"\t".repeat(depth)}${close}`;

export const moduleFileName = (name: string): string =>
	encodeURIComponent(name).replaceAll("~", "%7E").replaceAll("%", "~");

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
	const name = posix.basename(file, ".ts");
	return `_${(name === "page" ? posix.basename(posix.dirname(file)) : name).replaceAll(/[^\w$]/gu, "_")}`;
};

const uniquePaths = () => {
	const used = new Set<string>();
	return (base: string, extension: string): string => {
		let candidate = `${base}${extension}`;
		for (let suffix = 2; used.has(fileKey(candidate)); suffix += 1)
			candidate = `${base}_${suffix}${extension}`;
		used.add(fileKey(candidate));
		return candidate;
	};
};

const assetPath = (project: Project, path: string): string => {
	const under = (folder: string | undefined) =>
		folder !== undefined && fileKey(path).startsWith(fileKey(`${folder}/`))
			? path.slice(folder.length + 1)
			: undefined;
	const report = under(project.report);
	if (report !== undefined) return `assets/report/${report}`;
	const model = under(project.model);
	return model === undefined ? `assets/${path}` : `assets/model/${model}`;
};

const projectPath = (project: Project, url: URL): string =>
	relative(project.root, fileURLToPath(url)).split(sep).join("/");

const isFolder = (url: URL): boolean => url.pathname.endsWith("/");

export const renderModule = (
	file: string,
	value: unknown,
	assetOf: (url: URL) => string,
	{ header = "", idiomatic = false }: { readonly header?: string; readonly idiomatic?: boolean } = {},
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
					entries.map(([key, item]) => `${property(key)}: ${render(item, depth + 1)}`),
					"}",
				),
		});

	const tree = toNode(value, idiomatic);
	const used = [...new Set(helperNames(tree))].toSorted();
	const isConfig = file === CONFIG_FILE;
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
): { readonly modules: ReadonlyArray<Module>; readonly root: unknown } => {
	const modules: Array<Module> = [];
	const unique = uniquePaths();
	const add = (file: string, value: unknown) => {
		modules.push({ file, value });
		return new ModuleReference(file);
	};

	const pageModule = (page: Page) => {
		const folder = unique(`pages/${moduleFileName(page.name)}`, "");
		const visuals = page.visuals.map((visual) =>
			isRaw(visual) ? visual : add(unique(`${folder}/visuals/${moduleFileName(visual.name)}`, ".ts"), visual),
		);
		return add(`${folder}/page.ts`, { ...page, visuals });
	};

	const bookmark = <A extends { readonly name: string }>(item: A) =>
		isRaw(item) ? item : add(unique(`bookmarks/${moduleFileName(item.name)}`, ".ts"), item);

	const themeModule = (resource: Resource): unknown =>
		"theme" in resource
			? {
					...resource,
					theme: add(
						unique(`themes/${moduleFileName(posix.basename(resource.name, ".json"))}`, ".ts"),
						resource.theme,
					),
				}
			: resource;

	const { bookmarks, pages, resources } = config.report;
	const report = {
		...config.report,
		pages: pages.map((page) => pageModule(page)),
		...(bookmarks === undefined
			? {}
			: {
					bookmarks: {
						...bookmarks,
						items: bookmarks.items.map((item) =>
							"children" in item
								? { name: item.name, displayName: item.displayName, children: item.children.map(bookmark) }
								: bookmark(item),
						),
					},
				}),
		...(resources === undefined ? {} : { resources: resources.map((resource) => themeModule(resource)) }),
	};
	return { modules, root: { ...config, report } };
};

const urlsIn = (value: unknown): ReadonlyArray<URL> =>
	value instanceof URL
		? [value]
		: typeof value === "object" && value !== null
			? Object.values(value).flatMap((item) => urlsIn(item))
			: [];

const SUPPORT_FILES = {
	"package.json": { type: "module" },
	"tsconfig.json": {
		extends: `./${LOCAL_TSCONFIG}`,
		compilerOptions: {
			target: "ES2024",
			module: "NodeNext",
			strict: true,
			noEmit: true,
			allowImportingTsExtensions: true,
			skipLibCheck: true,
		},
		include: [CONFIG_FILE],
	},
};

export const supportFiles = (): ReadonlyArray<TreeFile> => [
	treeFile(".gitignore", encoder.encode(`${posix.dirname(LOCAL_TSCONFIG)}/\n`)),
	...Object.entries(SUPPORT_FILES).map(([path, value]) =>
		treeFile(path, encoder.encode(`${JSON.stringify(value, null, "\t")}\n`)),
	),
];

export const importFiles = (project: Project, config: Config, idiomatic: boolean): ImportFiles => {
	const assetOf = (url: URL) => assetPath(project, projectPath(project, url));
	const { modules, root } = projectModules(config);
	const rendered = [
		...modules.map(({ file, value }) =>
			treeFile(file, encoder.encode(renderModule(file, value, assetOf, { idiomatic }))),
		),
		treeFile(
			CONFIG_FILE,
			encoder.encode(renderModule(CONFIG_FILE, root, assetOf, { header: registerBlock(config), idiomatic })),
		),
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
		files: [...rendered, ...assets],
		folders: urls.filter((url) => isFolder(url)).map((url) => assetPath(project, projectPath(project, url))),
	};
};
