import { Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { ExplorationSettings } from "./1.0.0.ts";
import { FilterConfig, ReportFormattingObjects } from "./2.1.0.ts";
import { ReportFields, ThemeResourcePackageType } from "./shared.ts";

export * from "./shared.ts";
export { ExplorationSettings, FilterConfig, ReportFormattingObjects };

export const ThemeVersion = Struct({
	visual: String,
	page: String,
	report: String,
});

export type ThemeVersion = typeof ThemeVersion.Type;

export const ThemeMetadata = Struct({
	name: String,
	reportVersionAtImport: ThemeVersion,
	type: ThemeResourcePackageType,
});

export type ThemeMetadata = typeof ThemeMetadata.Type;

export const ThemeCollection = Struct({
	baseTheme: optionalKey(ThemeMetadata),
	customTheme: optionalKey(ThemeMetadata),
});

export type ThemeCollection = typeof ThemeCollection.Type;

export const Report = Struct({
	$schema: Literal(SchemaUrl.report["3.0.0"]),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
});

export type Report = typeof Report.Type;

export const defineReport = (report: Omit<Report, "$schema">): Report => ({
	$schema: Report.fields.$schema.literal,
	...report,
});
