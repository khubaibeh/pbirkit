import { Array, Literal, Literals, String, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterTypeValues, filterConfiguration } from "#schemas/filter-configuration/shared.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.0.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { FilterDefinition, QueryExpressionContainer } from "#schemas/semantic-query/1.0.0.ts";

import {
	PageBindingFields,
	PageFields,
	PageFormattingProperties,
	PageVisuals,
	autoPageGenerationConfig,
	bindingParameterFields,
} from "./shared.ts";

export * from "./shared.ts";

export const PageFormattingObjects = formattingObjects(Selector, PageFormattingProperties);

export type PageFormattingObjects = typeof PageFormattingObjects.Type;

export const { FilterConfig } = filterConfiguration({
	QueryExpressionContainer,
	FilterDefinition,
	Selector,
	FilterType: Literals(FilterTypeValues),
});

export type FilterConfig = typeof FilterConfig.Type;

export const BindingParameter = Struct({
	...bindingParameterFields(QueryExpressionContainer),
	boundFilter: String,
});

export type BindingParameter = typeof BindingParameter.Type;

export const PageBinding = Struct({
	...PageBindingFields,
	parameters: optionalKey(Array(BindingParameter)),
});

export type PageBinding = typeof PageBinding.Type;

export const AutoPageGenerationConfig = autoPageGenerationConfig(QueryExpressionContainer);

export type AutoPageGenerationConfig = typeof AutoPageGenerationConfig.Type;

export const Page = Struct({
	$schema: Literal(SchemaUrl.page["1.0.0"]),
	...PageFields,
	filterConfig: optionalKey(FilterConfig),
	pageBinding: optionalKey(PageBinding),
	objects: optionalKey(PageFormattingObjects),
	autoPageGenerationConfig: optionalKey(AutoPageGenerationConfig),
});

export type Page = typeof Page.Type;

export const PageDefinition = Struct({ ...Page.fields, visuals: PageVisuals });

export type PageDefinition = typeof PageDefinition.Type;

export const definePage = (page: Omit<PageDefinition, "$schema">): PageDefinition => ({
	$schema: Page.fields.$schema.literal,
	...page,
});
