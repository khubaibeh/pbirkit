import { Array, Record, String, Struct, URL as UrlSchema, Union, optionalKey } from "effect/Schema";
import { omit } from "effect/Struct";

import { BookmarksItem, RawBookmarks } from "#schemas/bookmarks-metadata";
import { Model } from "#schemas/model";
import type { ModelInput } from "#schemas/model";
import { AnyPage, RawPage } from "#schemas/page";
import { PagesMetadataItem } from "#schemas/pages";
import { Pbip } from "#schemas/pbip/1.0.0.ts";
import { PbirItem } from "#schemas/pbir";
import { PlatformItem } from "#schemas/platform";
import type { WithPlatformIds } from "#schemas/platform";
import { AnyReport } from "#schemas/report";
import { ReportExtension } from "#schemas/report-extension/1.0.0.ts";
import { VersionMetadata } from "#schemas/version/1.0.0.ts";

import { Resource } from "./resource.ts";

export { isRaw } from "#schemas/common/raw.ts";

/**
 * The `report` config entry. The build writes it as the `<name>.Report` folder.
 *
 * - `path`: The report folder name. It defaults to `<name>.Report`.
 * - `displayName`: The report name in `.platform`. It defaults to the config `name`.
 * - `logicalId`: The stable id in `.platform`. Required unless `platform` is a URL.
 * - `platform`: The `.platform` file, as fields or as a URL to copy.
 * - `pbir`: The `definition.pbir` file. Set `datasetReference.byConnection` only for a live connection.
 * - `definition`: The `definition/report.json` file, as any report version or as a URL to copy.
 * - `version`: The `definition/version.json` file.
 * - `pagesMetadata`: The `definition/pages/pages.json` file. The build fills `pageOrder` from the order of
 *   `pages`.
 * - `pages`: The pages. Each one becomes a `page.json` and one `visual.json` per visual.
 * - `bookmarks`: The `bookmarks/` folder: `bookmarks.json` and one `*.bookmark.json` per bookmark.
 * - `resources`: Themes, images and custom visuals. They fill `StaticResources/`, `CustomVisuals/` and
 *   `resourcePackages`.
 * - `fonts`: The custom font names that the report uses.
 * - `extensions`: The `definition/reportExtensions.json` file, for report-level measures.
 * - `semanticModelDiagramLayout`: A URL to copy as `semanticModelDiagramLayout.json` in the report folder.
 * - `files`: Extra files, keyed by the path inside the folder. A value is a URL to copy, or the file text. A
 *   key that ends in `/` maps a folder and takes a URL.
 * - `desktopOwned`: Paths inside the folder that Desktop owns. The build keeps them and never lists them for
 *   a port.
 */
export const ReportItem = Struct({
	path: optionalKey(String),
	displayName: optionalKey(String),
	logicalId: optionalKey(String),
	platform: Union([PlatformItem, UrlSchema]),
	pbir: Union([PbirItem, UrlSchema]),
	definition: Union([AnyReport, UrlSchema]),
	version: Union([VersionMetadata, UrlSchema]),
	pagesMetadata: Union([PagesMetadataItem, UrlSchema]),
	pages: Array(Union([AnyPage, RawPage])),
	bookmarks: optionalKey(Union([BookmarksItem, RawBookmarks])),
	resources: optionalKey(Array(Resource)),
	fonts: optionalKey(Array(String)),
	extensions: optionalKey(ReportExtension),
	semanticModelDiagramLayout: optionalKey(UrlSchema),
	files: optionalKey(Record(String, Union([UrlSchema, String]))),
	desktopOwned: optionalKey(Array(String)),
});

export type ReportItem = typeof ReportItem.Type;

/** The `pbip` config input. The build fills `artifacts`. */
export const PbipItem = Pbip.mapFields(omit(["artifacts"]));

export type PbipItem = typeof PbipItem.Type;

/**
 * The whole `pbirkit.config.ts` config. One config builds one `.pbip` project.
 *
 * - `name`: The project name. It names `<name>.pbip` and the `<name>.Report` folder.
 * - `out`: The folder where `pbirkit build` writes. It defaults to `dist`.
 * - `pbip`: The `.pbip` file, as fields or as a URL to copy.
 * - `model`: The local model. Set exactly one of `model` and `report.pbir.datasetReference.byConnection`.
 */
export const Config = Struct({
	name: String,
	out: optionalKey(String),
	pbip: Union([PbipItem, UrlSchema]),
	report: ReportItem,
	model: optionalKey(Model),
});

export type Config = typeof Config.Type;

/** The input of `defineConfig`. It adds the `logicalId` rules of `WithPlatformIds` to `Config`. */
export type ConfigInput = Omit<Config, "report" | "model"> & {
	readonly report: WithPlatformIds<ReportItem, "logicalId">;
	readonly model?: ModelInput;
};

export const defineConfig = (config: ConfigInput): ConfigInput => config;
