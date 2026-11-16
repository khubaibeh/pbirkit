import { Array, Literal, String, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.3.0.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { QueryExpressionContainer } from "#schemas/semantic-query/1.4.0.ts";

import { PageType } from "./1.3.0.ts";
import {
	PageBindingFields,
	PageFields,
	PageFormattingProperties,
	PageVisuals,
	autoPageGenerationConfig,
	bindingParameterFields,
} from "./shared.ts";

export * from "./shared.ts";
export { FilterConfig, PageType };

export const PageFormattingObjects = formattingObjects(Selector, PageFormattingProperties);

export type PageFormattingObjects = typeof PageFormattingObjects.Type;

export const BindingParameter = Struct({
	...bindingParameterFields(QueryExpressionContainer),
	boundFilter: optionalKey(String),
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
	$schema: Literal(
		"https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
	),
	...PageFields,
	filterConfig: optionalKey(FilterConfig),
	pageBinding: optionalKey(PageBinding),
	objects: optionalKey(PageFormattingObjects),
	type: optionalKey(PageType),
	autoPageGenerationConfig: optionalKey(AutoPageGenerationConfig),
});

export type Page = typeof Page.Type;

export const PageDefinition = Struct({ ...Page.fields, visuals: PageVisuals });

export type PageDefinition = typeof PageDefinition.Type;

export const definePage = (page: Omit<PageDefinition, "$schema">): PageDefinition => ({
	$schema: Page.fields.$schema.literal,
	...page,
});
