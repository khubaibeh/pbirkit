import { Boolean, Literal, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { FilterConfig, ReportFormattingObjects } from "./2.1.0.ts";
import { ThemeCollection, ThemeMetadata, ThemeVersion } from "./3.0.0.ts";
import { ExplorationSettingsFields, ReportFields } from "./shared.ts";

export * from "./shared.ts";
export { FilterConfig, ReportFormattingObjects, ThemeCollection, ThemeMetadata, ThemeVersion };

export const FieldParameterReportSettings = Struct({
	skipHierarchyLevelPersistence: optionalKey(Boolean),
});

export type FieldParameterReportSettings = typeof FieldParameterReportSettings.Type;

export const ExplorationSettings = Struct({
	...ExplorationSettingsFields,
	fieldParameterReportSettings: optionalKey(FieldParameterReportSettings),
});

export type ExplorationSettings = typeof ExplorationSettings.Type;

export const Report = Struct({
	$schema: Literal(SchemaUrl.report["3.1.0"]),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
});

export type Report = typeof Report.Type;
