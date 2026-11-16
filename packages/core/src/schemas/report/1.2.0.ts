import { Literal, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.0.0.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.2.0.ts";

import { ExplorationSettings, LayoutOptimization, ThemeCollection, ThemeMetadata } from "./1.0.0.ts";
import { ReportFields, ReportFormattingProperties } from "./shared.ts";

export * from "./shared.ts";

export { FilterConfig };

export const ReportFormattingObjects = formattingObjects(Selector, ReportFormattingProperties);

export type ReportFormattingObjects = typeof ReportFormattingObjects.Type;
export { ExplorationSettings, LayoutOptimization, ThemeCollection, ThemeMetadata };

export const Report = Struct({
	$schema: Literal(
		"https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/1.2.0/schema.json",
	),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
	layoutOptimization: LayoutOptimization,
});

export type Report = typeof Report.Type;
