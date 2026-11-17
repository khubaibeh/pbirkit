import { Literal, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.2.0.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.4.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";

import { ExplorationSettings, ThemeCollection, ThemeMetadata } from "./1.0.0.ts";
import { ReportFields, ReportFormattingProperties } from "./shared.ts";

export * from "./shared.ts";

export { FilterConfig };

export const ReportFormattingObjects = formattingObjects(Selector, ReportFormattingProperties);

export type ReportFormattingObjects = typeof ReportFormattingObjects.Type;
export { ExplorationSettings, ThemeCollection, ThemeMetadata };

export const Report = Struct({
	$schema: Literal(SchemaUrl.report["2.1.0"]),
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
