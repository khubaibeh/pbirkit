import { Literal, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { ExplorationSettings, ThemeCollection, ThemeMetadata } from "./1.0.0.ts";
import { FilterConfig, ReportFormattingObjects } from "./1.3.0.ts";
import { ReportFields } from "./shared.ts";

export * from "./shared.ts";
export { ExplorationSettings, FilterConfig, ReportFormattingObjects, ThemeCollection, ThemeMetadata };

export const Report = Struct({
	$schema: Literal(SchemaUrl.report["2.0.0"]),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
});

export type Report = typeof Report.Type;
