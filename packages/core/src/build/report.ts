import { Option } from "effect";

import { isRaw } from "#schemas/common/raw.ts";

import type { Config } from "../config.ts";
import type { Resource } from "../resource.ts";
import { modelFolder, modelOf } from "./model.ts";
import { resourceFiles, resourcePackages } from "./resources.ts";
import type { BuildFile } from "./shared.ts";
import { jsonFile, jsonOrSource, platform, rawFiles, whenSet, withoutDot } from "./shared.ts";

type Report = Config["report"];
type Definition = Exclude<Report["definition"], URL>;
type Bookmarks = NonNullable<Report["bookmarks"]>;
type BookmarkItem = Bookmarks["items"][number];
type Page = Report["pages"][number];

const AFTER_PACKAGES: ReadonlySet<string> = new Set([
	"organizationCustomVisuals",
	"annotations",
	"dataSourceVariables",
	"settings",
	"slowDataSourceSettings",
]);

export const reportFolder = (config: Config): string =>
	withoutDot(config.report.path ?? `${config.name}.Report`);

const pbip = (config: Config) => {
	if (config.pbip instanceof URL) return config.pbip;
	const { $schema, version, ...rest } = config.pbip;

	return { $schema, version, artifacts: [{ report: { path: reportFolder(config) } }], ...rest };
};

const definitionPbir = (config: Config) => {
	const { pbir } = config.report;
	if (pbir instanceof URL) return pbir;

	return Option.match(modelOf(config), {
		onNone: () => pbir,
		onSome: (model) => ({
			...pbir,
			datasetReference: {
				byPath: { path: `${"../".repeat(reportFolder(config).split("/").length)}${modelFolder(model)}` },
			},
		}),
	});
};

const reportPlatform = (config: Config) => {
	const { displayName = config.name, logicalId, platform: item } = config.report;

	return item instanceof URL ? item : platform("Report", displayName, logicalId, item);
};

const withResourcePackages = (definition: Definition, resources: ReadonlyArray<Resource>) => {
	const entries = Object.entries(definition);
	const after = entries.findIndex(([key]) => AFTER_PACKAGES.has(key));
	const at = after === -1 ? entries.length : after;

	return Object.fromEntries(entries.toSpliced(at, 0, ["resourcePackages", resourcePackages(resources)]));
};

const reportDefinition = ({ definition, resources }: Report) =>
	definition instanceof URL || resources === undefined || definition.resourcePackages !== undefined
		? definition
		: withResourcePackages(definition, resources);

const pagesMetadata = ({ pagesMetadata: metadata, pages }: Report) => {
	if (metadata instanceof URL) return metadata;
	const { $schema, ...rest } = metadata;

	return { $schema, pageOrder: pages.map((page) => page.name), ...rest };
};

const bookmarkItem = (item: BookmarkItem) =>
	"children" in item
		? { name: item.name, displayName: item.displayName, children: item.children.map((child) => child.name) }
		: { name: item.name };

const bookmarksMetadata = (bookmarks: Bookmarks) => {
	if (isRaw(bookmarks)) return bookmarks.file;
	const { items, ...metadata } = bookmarks;

	return { ...metadata, items: items.map((item) => bookmarkItem(item)) };
};

const bookmarkFiles = (folder: string, bookmarks: Bookmarks): ReadonlyArray<BuildFile> => [
	jsonOrSource(`${folder}/bookmarks.json`, bookmarksMetadata(bookmarks)),
	...bookmarks.items
		.flatMap((item) => ("children" in item ? item.children : [item]))
		.map((bookmark) =>
			jsonOrSource(`${folder}/${bookmark.name}.bookmark.json`, isRaw(bookmark) ? bookmark.file : bookmark),
		),
];

const pageFiles = (definition: string, page: Page): ReadonlyArray<BuildFile> => {
	const { visuals, ...rest } = page;
	const folder = `${definition}/pages/${page.name}`;

	return [
		jsonOrSource(`${folder}/page.json`, isRaw(page) ? page.file : rest),
		...visuals.map((visual) =>
			jsonOrSource(`${folder}/visuals/${visual.name}/visual.json`, isRaw(visual) ? visual.file : visual),
		),
	];
};

export const reportFiles = (config: Config): ReadonlyArray<BuildFile> => {
	const report = reportFolder(config);
	const definition = `${report}/definition`;
	const { bookmarks, extensions, files, pages, resources = [] } = config.report;

	return [
		jsonOrSource(`${config.name}.pbip`, pbip(config)),
		jsonOrSource(`${report}/.platform`, reportPlatform(config)),
		jsonOrSource(`${report}/definition.pbir`, definitionPbir(config)),
		jsonOrSource(`${definition}/report.json`, reportDefinition(config.report)),
		jsonOrSource(`${definition}/version.json`, config.report.version),
		jsonOrSource(`${definition}/pages/pages.json`, pagesMetadata(config.report)),
		...whenSet(bookmarks, (items) => bookmarkFiles(`${definition}/bookmarks`, items)),
		...whenSet(extensions, (value) => [jsonFile(`${definition}/reportExtensions.json`, value)]),
		...pages.flatMap((page) => pageFiles(definition, page)),
		...resources.flatMap((resource) => resourceFiles(report, resource)),
		...whenSet(config.report.semanticModelDiagramLayout, (source) => [
			{ path: `${report}/semanticModelDiagramLayout.json`, source },
		]),
		...whenSet(files, (items) => rawFiles(report, items)),
	];
};
