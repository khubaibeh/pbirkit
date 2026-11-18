import type { Config } from "./config.ts";
import type { Pbiviz } from "./custom-visual.ts";
import { packageItem } from "./resource.ts";
import type { PackageItem, Resource } from "./resource.ts";

export type BuildFile =
	| { readonly path: string; readonly content: string }
	| { readonly path: string; readonly source: URL }
	| { readonly path: string; readonly sourceFolder: URL };

const INDENT = "  ";

const trimZeros = (digits: string): string =>
	digits.includes(".") ? digits.replace(/0+$/u, "").replace(/\.$/u, "") : digits;

const general = (value: number, precision: number): string => {
	const [mantissa = "", exponentText = "0"] = value.toExponential(precision - 1).split("e");
	const exponent = Number(exponentText);
	if (exponent < -4 || exponent >= precision) {
		return `${trimZeros(mantissa)}E${exponent < 0 ? "-" : "+"}${String(Math.abs(exponent)).padStart(2, "0")}`;
	}
	return trimZeros(value.toPrecision(precision));
};

export const formatNumber = (value: number): string => {
	if (!Number.isFinite(value)) throw new TypeError(`[ERROR] build: cannot write the number ${value} as JSON`);
	if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
	const short = general(value, 15);
	return Number(short) === value ? short : general(value, 17);
};

const formatString = (value: string): string =>
	JSON.stringify(value).replaceAll(
		/[\u0085\u2028\u2029]/gu,
		(char) => `\\u${(char.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`,
	);

const field = (value: object, key: string): unknown => Reflect.get(value, key);

const serialize = (value: unknown, depth: number): string => {
	if (value === null || value === undefined) return "null";
	if (typeof value === "number") return formatNumber(value);
	if (typeof value === "string") return formatString(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value !== "object") throw new TypeError(`[ERROR] build: cannot write a ${typeof value} as JSON`);
	const inner = INDENT.repeat(depth + 1);
	const outer = INDENT.repeat(depth);
	if (Array.isArray(value)) {
		const items: ReadonlyArray<unknown> = value;
		return items.length === 0
			? "[]"
			: `[\n${items.map((item) => `${inner}${serialize(item, depth + 1)}`).join(",\n")}\n${outer}]`;
	}
	const entries = Object.keys(value).flatMap((key) => {
		const item = field(value, key);
		return item === undefined ? [] : [`${inner}${formatString(key)}: ${serialize(item, depth + 1)}`];
	});
	return entries.length === 0 ? "{}" : `{\n${entries.join(",\n")}\n${outer}}`;
};

export const toJson = (value: unknown): string => serialize(value, 0).replaceAll("\n", "\r\n");

const withoutDot = (path: string): string => path.replace(/^\.\//u, "").replace(/\/+$/u, "");

const platform = (
	type: string,
	displayName: string,
	logicalId: string,
	item: Config["report"]["platform"],
) => {
	const { $schema, version, ...metadata } = item;
	return { $schema, metadata: { type, displayName, ...metadata }, config: { version, logicalId } };
};

const pbip = (config: Config, reportPath: string) => {
	const { $schema, version, ...rest } = config.pbip;
	return { $schema, version, artifacts: [{ report: { path: reportPath } }], ...rest };
};

type Bookmarks = NonNullable<Config["report"]["bookmarks"]>;

const bookmarkFiles = (folder: string, bookmarks: Bookmarks): ReadonlyArray<readonly [string, unknown]> => {
	const { items, ...metadata } = bookmarks;
	const all = items.flatMap((item) => ("children" in item ? item.children : [item]));
	return [
		[
			`${folder}/bookmarks.json`,
			{
				...metadata,
				items: items.map((item) =>
					"children" in item
						? {
								name: item.name,
								displayName: item.displayName,
								children: item.children.map((child) => child.name),
							}
						: { name: item.name },
				),
			},
		],
		...all.map((bookmark) => [`${folder}/${bookmark.name}.bookmark.json`, bookmark] as const),
	];
};

const resourcePackages = (resources: ReadonlyArray<Resource>) => {
	const packages = new Map<
		string,
		{ name: string; type: PackageItem["type"]; items: Array<PackageItem["item"]> }
	>();
	for (const resource of resources) {
		const { package: name, type, item } = packageItem(resource);
		const entry = packages.get(name) ?? { name, type, items: [] };
		entry.items.push(item);
		packages.set(name, entry);
	}
	return [...packages.values()];
};

const AFTER_PACKAGES: ReadonlySet<string> = new Set([
	"organizationCustomVisuals",
	"annotations",
	"dataSourceVariables",
	"settings",
	"slowDataSourceSettings",
]);

const reportDefinition = (config: Config) => {
	const { definition, resources } = config.report;
	if (resources === undefined) return definition;
	const entries = Object.entries(definition);
	const at = entries.findIndex(([key]) => AFTER_PACKAGES.has(key));
	return Object.fromEntries(
		entries.toSpliced(at === -1 ? entries.length : at, 0, ["resourcePackages", resourcePackages(resources)]),
	);
};

const visualPackage = (guid: string, pbiviz: Pbiviz) => {
	const { name, displayName, version, description, supportUrl, gitHubUrl, visualClassName } = pbiviz.visual;
	return {
		version,
		author: pbiviz.author,
		resources: [{ resourceId: "rId0", sourceType: 5, file: `resources/${guid}.pbiviz.json` }],
		visual: { guid, name, displayName, version, description, supportUrl, gitHubUrl, visualClassName },
		metadata: { pbivizjson: { resourceId: "rId0" } },
	};
};

const resourceFiles = (report: string, resource: Resource): ReadonlyArray<BuildFile> => {
	if (resource.kind === "customVisual") {
		const folder = `${report}/CustomVisuals/${resource.guid}`;
		return resource.pbiviz === undefined
			? []
			: [
					{ path: `${folder}/package.json`, content: toJson(visualPackage(resource.guid, resource.pbiviz)) },
					{ path: `${folder}/resources/${resource.guid}.pbiviz.json`, content: toJson(resource.pbiviz) },
				];
	}
	const { package: name, item } = packageItem(resource);
	const path = `${report}/StaticResources/${name}/${item.path}`;
	return [
		resource.kind === "image" ? { path, source: resource.file } : { path, content: toJson(resource.theme) },
	];
};

type Model = NonNullable<Config["model"]>;

const modelFiles = (model: Model): ReadonlyArray<BuildFile> => {
	const folder = withoutDot(model.path);
	const json = (path: string, value: unknown): BuildFile => ({
		path: `${folder}/${path}`,
		content: toJson(value),
	});
	return [
		json(".platform", platform("SemanticModel", model.name, model.logicalId, model.platform)),
		json("definition.pbism", model.pbism),
		...(model.modelReference === undefined ? [] : [json("modelReference.json", model.modelReference)]),
		...(model.editorSettings === undefined ? [] : [json(".pbi/editorSettings.json", model.editorSettings)]),
		{ path: `${folder}/definition`, sourceFolder: model.definition },
		...(model.diagramLayout === undefined
			? []
			: [{ path: `${folder}/diagramLayout.json`, source: model.diagramLayout }]),
		...(model.daxQueries === undefined
			? []
			: [{ path: `${folder}/DAXQueries`, sourceFolder: model.daxQueries }]),
		...(model.cache === undefined ? [] : [{ path: `${folder}/.pbi/cache.abf`, source: model.cache }]),
	];
};

const definitionPbir = (config: Config) =>
	config.model === undefined
		? config.report.pbir
		: {
				...config.report.pbir,
				datasetReference: { byPath: { path: `../${withoutDot(config.model.path)}` } },
			};

export const ownedFolders = (config: Config): ReadonlyArray<string> => {
	const report = `${config.name}.Report`;
	const model = config.model === undefined ? undefined : withoutDot(config.model.path);
	return [
		...(config.report.resources === undefined
			? []
			: [`${report}/StaticResources`, `${report}/CustomVisuals`]),
		...(model === undefined ? [] : [`${model}/definition`]),
		...(model === undefined || config.model?.daxQueries === undefined ? [] : [`${model}/DAXQueries`]),
	];
};

export const buildFiles = (config: Config): ReadonlyArray<BuildFile> => {
	const report = `${config.name}.Report`;
	const definition = `${report}/definition`;
	const { bookmarks, extensions, pagesMetadata, resources = [] } = config.report;
	const { $schema, ...pagesRest } = pagesMetadata;
	const files: Array<readonly [string, unknown]> = [
		[`${config.name}.pbip`, pbip(config, report)],
		[`${report}/.platform`, platform("Report", config.name, config.report.logicalId, config.report.platform)],
		[`${report}/definition.pbir`, definitionPbir(config)],
		[`${definition}/report.json`, reportDefinition(config)],
		[`${definition}/version.json`, config.report.version],
		[
			`${definition}/pages/pages.json`,
			{ $schema, pageOrder: config.report.pages.map((page) => page.name), ...pagesRest },
		],
		...(bookmarks === undefined ? [] : bookmarkFiles(`${definition}/bookmarks`, bookmarks)),
		...(extensions === undefined ? [] : [[`${definition}/reportExtensions.json`, extensions] as const]),
	];
	for (const page of config.report.pages) {
		const { visuals, ...rest } = page;
		const folder = `${definition}/pages/${page.name}`;
		files.push([`${folder}/page.json`, rest]);
		for (const visual of visuals) files.push([`${folder}/visuals/${visual.name}/visual.json`, visual]);
	}
	return files
		.map(([path, value]): BuildFile => ({ path, content: toJson(value) }))
		.concat(
			resources.flatMap((resource) => resourceFiles(report, resource)),
			config.model === undefined ? [] : modelFiles(config.model),
		);
};
