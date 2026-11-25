import { Array, Literal, String, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.3.0.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
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

/** The page `objects`: each formatting object maps to a list of selector and property pairs. */
export const PageFormattingObjects = formattingObjects(Selector, PageFormattingProperties);

export type PageFormattingObjects = typeof PageFormattingObjects.Type;

/**
 * A field that a drillthrough or tooltip page takes as a filter.
 *
 * - `boundFilter`: The `name` of the page filter that the parameter sets.
 */
export const BindingParameter = Struct({
	...bindingParameterFields(QueryExpressionContainer),
	boundFilter: optionalKey(String),
});

export type BindingParameter = typeof BindingParameter.Type;

/**
 * Makes the page a drillthrough or tooltip target.
 *
 * - `parameters`: The fields that the page takes from the source visual.
 */
export const PageBinding = Struct({
	...PageBindingFields,
	parameters: optionalKey(Array(BindingParameter)),
});

export type PageBinding = typeof PageBinding.Type;

/** The settings that made the page automatically, such as through Auto create. */
export const AutoPageGenerationConfig = autoPageGenerationConfig(QueryExpressionContainer);

export type AutoPageGenerationConfig = typeof AutoPageGenerationConfig.Type;

/**
 * The `page.json` file of one page.
 *
 * - `filterConfig`: Filters on every visual of the page, on top of the report filters.
 * - `pageBinding`: The drillthrough or tooltip binding of the page.
 * - `objects`: Page formatting, such as `background`, `pageSize` and `outspacePane`.
 * - `type`: `Drillthrough` or `Tooltip` for a page with a special use.
 * - `autoPageGenerationConfig`: The settings that made the page automatically. Desktop writes it.
 */
export const Page = Struct({
	$schema: Literal(SchemaUrl.page["2.1.0"]),
	...PageFields,
	filterConfig: optionalKey(FilterConfig),
	pageBinding: optionalKey(PageBinding),
	objects: optionalKey(PageFormattingObjects),
	type: optionalKey(PageType),
	autoPageGenerationConfig: optionalKey(AutoPageGenerationConfig),
});

export type Page = typeof Page.Type;

/** One page in config input: the `page.json` fields plus the page visuals. */
export const PageDefinition = Struct({ ...Page.fields, visuals: PageVisuals });

export type PageDefinition = typeof PageDefinition.Type;

/** Builds a 2.1.0 page and fills `$schema`. Export it as the default of `src/pages/<page>/index.ts`. */
export const definePage = (page: Omit<PageDefinition, "$schema">): PageDefinition => ({
	$schema: Page.fields.$schema.literal,
	...page,
});
