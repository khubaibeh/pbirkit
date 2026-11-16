import { Boolean, Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { ThemeCollection, ThemeMetadata, ThemeVersion } from "./3.0.0.ts";
import { FieldParameterReportSettings } from "./3.1.0.ts";
import { FilterConfig, ReportFormattingObjects } from "./3.2.0.ts";
import { ExplorationSettingsFields, ReportFields } from "./shared.ts";

export * from "./shared.ts";
export {
	FieldParameterReportSettings,
	FilterConfig,
	ReportFormattingObjects,
	ThemeCollection,
	ThemeMetadata,
	ThemeVersion,
};

export const ExplorationSettings = Struct({
	...ExplorationSettingsFields,
	fieldParameterReportSettings: optionalKey(FieldParameterReportSettings),
	defaultDataExplorePerspective: optionalKey(String),
	locale: optionalKey(String),
	defaultDisplayUnitsToNone: optionalKey(Boolean),
});

export type ExplorationSettings = typeof ExplorationSettings.Type;

export const Report = Struct({
	$schema: Literal(SchemaUrl.report["3.3.0"]),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
});

export type Report = typeof Report.Type;
