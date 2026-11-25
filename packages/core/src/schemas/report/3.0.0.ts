import { Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { ExplorationSettings } from "./1.0.0.ts";
import { FilterConfig, ReportFormattingObjects } from "./2.1.0.ts";
import { ReportFields, ThemeResourcePackageType } from "./shared.ts";

export * from "./shared.ts";
export { ExplorationSettings, FilterConfig, ReportFormattingObjects };

/** The highest schema versions in the report when the theme came in. */
export const ThemeVersion = Struct({
	visual: String,
	page: String,
	report: String,
});

export type ThemeVersion = typeof ThemeVersion.Type;

/**
 * A theme that the report uses.
 *
 * - `name`: The theme name.
 * - `reportVersionAtImport`: The report versions when the theme came in.
 * - `type`: `SharedResources` for a built-in theme, `RegisteredResources` for a file in the report.
 */
export const ThemeMetadata = Struct({
	name: String,
	reportVersionAtImport: ThemeVersion,
	type: ThemeResourcePackageType,
});

export type ThemeMetadata = typeof ThemeMetadata.Type;

/**
 * The themes of the report. The theme helpers in `pbirkit/resource` fill it.
 *
 * - `baseTheme`: The Power BI base theme for a monthly release.
 * - `customTheme`: A custom theme on top of the base theme. Properties it leaves out come from the base
 *   theme.
 */
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
