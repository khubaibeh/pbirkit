import { Array, Record, String, Struct, URL as UrlSchema, Union, optionalKey } from "effect/Schema";
import { omit } from "effect/Struct";

import { BookmarksItem, RawBookmarks } from "#schemas/bookmarks-metadata";
import { Model } from "#schemas/model";
import { AnyPage, RawPage } from "#schemas/page";
import { PagesMetadataItem } from "#schemas/pages";
import { Pbip } from "#schemas/pbip/1.0.0.ts";
import { PbirItem } from "#schemas/pbir";
import { PlatformItem } from "#schemas/platform";
import { AnyReport } from "#schemas/report";
import { ReportExtension } from "#schemas/report-extension/1.0.0.ts";
import { VersionMetadata } from "#schemas/version/1.0.0.ts";

import { Resource } from "./resource.ts";

export { isRaw } from "#schemas/common/raw.ts";

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

export const PbipItem = Pbip.mapFields(omit(["artifacts"]));

export type PbipItem = typeof PbipItem.Type;

export const Config = Struct({
	name: String,
	out: optionalKey(String),
	pbip: Union([PbipItem, UrlSchema]),
	report: ReportItem,
	model: optionalKey(Model),
});

export type Config = typeof Config.Type;

export const defineConfig = (config: Config): Config => config;
