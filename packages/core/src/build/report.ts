import { Option } from "effect";

import type { Config } from "../config.ts";
import type { Resource } from "../resource.ts";
import { modelFolder, modelOf } from "./model.ts";
import { resourceFiles, resourcePackages } from "./resources.ts";
import type { BuildFile } from "./shared.ts";
import { jsonFile, platform, whenSet } from "./shared.ts";

type Report = Config["report"];
type Bookmarks = NonNullable<Report["bookmarks"]>;
type BookmarkEntry = Bookmarks["items"][number];
type Page = Report["pages"][number];

const AFTER_PACKAGES: ReadonlySet<string> = new Set([
	"organizationCustomVisuals",
	"annotations",
	"dataSourceVariables",
	"settings",
	"slowDataSourceSettings",
]);

export const reportFolder = (config: Config): string => `${config.name}.Report`;

const pbip = (config: Config) => {
	const { $schema, version, ...rest } = config.pbip;

	return { $schema, version, artifacts: [{ report: { path: reportFolder(config) } }], ...rest };
};

const definitionPbir = (config: Config) =>
	Option.match(modelOf(config), {
		onNone: () => config.report.pbir,
		onSome: (model) => ({
			...config.report.pbir,
			datasetReference: { byPath: { path: `../${modelFolder(model)}` } },
		}),
	});

const withResourcePackages = (definition: Report["definition"], resources: ReadonlyArray<Resource>) => {
	const entries = Object.entries(definition);
	const after = entries.findIndex(([key]) => AFTER_PACKAGES.has(key));
	const at = after === -1 ? entries.length : after;

	return Object.fromEntries(entries.toSpliced(at, 0, ["resourcePackages", resourcePackages(resources)]));
};

const reportDefinition = (report: Report) =>
	Option.match(Option.fromNullishOr(report.resources), {
		onNone: () => report.definition,
		onSome: (resources) => withResourcePackages(report.definition, resources),
	});

const bookmarkItem = (item: BookmarkEntry) =>
	"children" in item
		? { name: item.name, displayName: item.displayName, children: item.children.map((child) => child.name) }
		: { name: item.name };

const bookmarkFiles = (folder: string, bookmarks: Bookmarks): ReadonlyArray<BuildFile> => {
	const { items, ...metadata } = bookmarks;
	const all = items.flatMap((item) => ("children" in item ? item.children : [item]));

	return [
		jsonFile(`${folder}/bookmarks.json`, { ...metadata, items: items.map((item) => bookmarkItem(item)) }),
		...all.map((bookmark) => jsonFile(`${folder}/${bookmark.name}.bookmark.json`, bookmark)),
	];
};

const pageFiles = (definition: string, page: Page): ReadonlyArray<BuildFile> => {
	const { visuals, ...rest } = page;
	const folder = `${definition}/pages/${page.name}`;

	return [
		jsonFile(`${folder}/page.json`, rest),
		...visuals.map((visual) => jsonFile(`${folder}/visuals/${visual.name}/visual.json`, visual)),
	];
};

export const reportFiles = (config: Config): ReadonlyArray<BuildFile> => {
	const report = reportFolder(config);
	const definition = `${report}/definition`;
	const { bookmarks, extensions, pages, pagesMetadata, resources = [] } = config.report;
	const { $schema, ...pagesRest } = pagesMetadata;

	return [
		jsonFile(`${config.name}.pbip`, pbip(config)),
		jsonFile(
			`${report}/.platform`,
			platform("Report", config.name, config.report.logicalId, config.report.platform),
		),
		jsonFile(`${report}/definition.pbir`, definitionPbir(config)),
		jsonFile(`${definition}/report.json`, reportDefinition(config.report)),
		jsonFile(`${definition}/version.json`, config.report.version),
		jsonFile(`${definition}/pages/pages.json`, {
			$schema,
			pageOrder: pages.map((page) => page.name),
			...pagesRest,
		}),
		...whenSet(bookmarks, (items) => bookmarkFiles(`${definition}/bookmarks`, items)),
		...whenSet(extensions, (value) => [jsonFile(`${definition}/reportExtensions.json`, value)]),
		...pages.flatMap((page) => pageFiles(definition, page)),
		...resources.flatMap((resource) => resourceFiles(report, resource)),
	];
};
