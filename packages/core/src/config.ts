import { Array, Record, String, Struct, URL as UrlSchema, optionalKey } from "effect/Schema";
import { omit } from "effect/Struct";

import { BookmarksItem } from "#schemas/bookmarks-metadata";
import { Model } from "#schemas/model";
import { AnyPage } from "#schemas/page";
import { PagesMetadataItem } from "#schemas/pages";
import { Pbip } from "#schemas/pbip/1.0.0.ts";
import { PbirItem } from "#schemas/pbir";
import { PlatformItem } from "#schemas/platform";
import { AnyReport } from "#schemas/report";
import { ReportExtension } from "#schemas/report-extension/1.0.0.ts";
import { VersionMetadata } from "#schemas/version/1.0.0.ts";

import { Resource } from "./resource.ts";

export const ReportItem = Struct({
	logicalId: String,
	platform: PlatformItem,
	pbir: PbirItem,
	definition: AnyReport,
	version: VersionMetadata,
	pagesMetadata: PagesMetadataItem,
	pages: Array(AnyPage),
	bookmarks: optionalKey(BookmarksItem),
	resources: optionalKey(Array(Resource)),
	fonts: optionalKey(Array(String)),
	extensions: optionalKey(ReportExtension),
	semanticModelDiagramLayout: optionalKey(UrlSchema),
	files: optionalKey(Record(String, UrlSchema)),
});

export type ReportItem = typeof ReportItem.Type;

export const Config = Struct({
	name: String,
	out: optionalKey(String),
	pbip: Pbip.mapFields(omit(["artifacts"])),
	report: ReportItem,
	model: optionalKey(Model),
});

export type Config = typeof Config.Type;

export const defineConfig = (config: Config): Config => config;
