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

/**
 * The report `settings` block.
 *
 * - `fieldParameterReportSettings`: Settings for field parameters across all visuals.
 * - `defaultDataExplorePerspective`: The default perspective of the model for the report.
 * - `locale`: The report locale, such as `en-US`. It beats the browser and system locale.
 * - `defaultDisplayUnitsToNone`: When true, number display units default to none.
 */
export const ExplorationSettings = Struct({
	...ExplorationSettingsFields,
	fieldParameterReportSettings: optionalKey(FieldParameterReportSettings),
	defaultDataExplorePerspective: optionalKey(String),
	locale: optionalKey(String),
	defaultDisplayUnitsToNone: optionalKey(Boolean),
});

export type ExplorationSettings = typeof ExplorationSettings.Type;

/**
 * The `definition/report.json` file: report filters, formatting, themes and settings.
 *
 * - `filterConfig`: Filters on every page and visual of the report.
 * - `objects`: Report formatting, such as the filter pane state.
 * - `themeCollection`: The base and custom themes.
 * - `settings`: Report behavior settings.
 */
export const Report = Struct({
	$schema: Literal(SchemaUrl.report["3.3.0"]),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
});

export type Report = typeof Report.Type;

/** Builds a 3.3.0 `report.json` and fills `$schema`. */
export const defineReport = (report: Omit<Report, "$schema">): Report => ({
	$schema: Report.fields.$schema.literal,
	...report,
});
