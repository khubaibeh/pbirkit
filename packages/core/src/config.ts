import { Array, String, Struct, optionalKey } from "effect/Schema";
import { omit } from "effect/Struct";

import { Model } from "#schemas/model";
import { AnyPage } from "#schemas/page";
import { PagesMetadataItem } from "#schemas/pages";
import { Pbip } from "#schemas/pbip/1.0.0.ts";
import { PbirItem } from "#schemas/pbir";
import { PlatformItem } from "#schemas/platform";
import { AnyReport } from "#schemas/report";
import { ReportExtension } from "#schemas/report-extension/1.0.0.ts";
import { VersionMetadata } from "#schemas/version/1.0.0.ts";

export const ReportItem = Struct({
	logicalId: String,
	platform: PlatformItem,
	pbir: PbirItem,
	definition: AnyReport,
	version: VersionMetadata,
	pagesMetadata: PagesMetadataItem,
	extensions: optionalKey(ReportExtension),
});

export type ReportItem = typeof ReportItem.Type;

export const Config = Struct({
	name: String,
	pbip: Pbip.mapFields(omit(["artifacts"])),
	report: ReportItem,
	model: Model,
	pages: Array(AnyPage),
});

export type Config = typeof Config.Type;

export const defineConfig = (config: Config): Config => config;
