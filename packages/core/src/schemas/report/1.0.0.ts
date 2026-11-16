import { Literal, Literals, String, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterTypeValues, filterConfiguration } from "#schemas/filter-configuration/shared.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.0.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { FilterDefinition, QueryExpressionContainer } from "#schemas/semantic-query/1.0.0.ts";

import {
	ExplorationSettingsFields,
	ReportFields,
	ReportFormattingProperties,
	ThemeResourcePackageType,
} from "./shared.ts";

export * from "./shared.ts";

export const ReportFormattingObjects = formattingObjects(Selector, ReportFormattingProperties);

export type ReportFormattingObjects = typeof ReportFormattingObjects.Type;

export const { FilterConfig } = filterConfiguration({
	QueryExpressionContainer,
	FilterDefinition,
	Selector,
	FilterType: Literals(FilterTypeValues),
});

export type FilterConfig = typeof FilterConfig.Type;

export const ThemeMetadata = Struct({
	name: String,
	reportVersionAtImport: String,
	type: ThemeResourcePackageType,
});

export type ThemeMetadata = typeof ThemeMetadata.Type;

export const ThemeCollection = Struct({
	baseTheme: optionalKey(ThemeMetadata),
	customTheme: optionalKey(ThemeMetadata),
});

export type ThemeCollection = typeof ThemeCollection.Type;

export const ExplorationSettings = Struct(ExplorationSettingsFields);

export type ExplorationSettings = typeof ExplorationSettings.Type;

export const LayoutOptimization = Literals(["None", "PhonePortrait"]);

export const Report = Struct({
	$schema: Literal(SchemaUrl.report["1.0.0"]),
	filterConfig: optionalKey(FilterConfig),
	objects: optionalKey(ReportFormattingObjects),
	...ReportFields,
	themeCollection: ThemeCollection,
	settings: optionalKey(ExplorationSettings),
	layoutOptimization: LayoutOptimization,
});

export type Report = typeof Report.Type;
