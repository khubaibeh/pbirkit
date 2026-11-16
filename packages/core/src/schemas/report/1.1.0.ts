import { Literal, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterType, filterConfiguration } from "#schemas/filter-configuration/shared.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.1.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { FilterDefinition, QueryExpressionContainer } from "#schemas/semantic-query/1.1.0.ts";

import { ExplorationSettings, LayoutOptimization, ThemeCollection, ThemeMetadata } from "./1.0.0.ts";
import { ReportFields, ReportFormattingProperties } from "./shared.ts";

export * from "./shared.ts";

export const ReportFormattingObjects = formattingObjects(Selector, ReportFormattingProperties);

export type ReportFormattingObjects = typeof ReportFormattingObjects.Type;

export const { FilterConfig } = filterConfiguration({
	QueryExpressionContainer,
	FilterDefinition,
	Selector,
	FilterType: FilterType,
});

export type FilterConfig = typeof FilterConfig.Type;
export { ExplorationSettings, LayoutOptimization, ThemeCollection, ThemeMetadata };

export const Report = Struct({
	$schema: Literal(SchemaUrl.report["1.1.0"]),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
	layoutOptimization: LayoutOptimization,
});

export type Report = typeof Report.Type;
