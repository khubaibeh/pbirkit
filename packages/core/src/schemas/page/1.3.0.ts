import { Literal, Literals, Struct, optionalKey } from "effect/Schema";

import { FilterConfig } from "#schemas/filter-configuration/1.0.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";

import { AutoPageGenerationConfig, BindingParameter, PageBinding, PageFormattingObjects } from "./1.2.0.ts";
import { PageFields, PageVisuals } from "./shared.ts";

export * from "./shared.ts";
export { AutoPageGenerationConfig, BindingParameter, FilterConfig, PageBinding, PageFormattingObjects };

/** A special use of a page: a drillthrough target or a tooltip. */
export const PageType = Literals(["Drillthrough", "Tooltip"]);

export type PageType = typeof PageType.Type;

export const Page = Struct({
	$schema: Literal(SchemaUrl.page["1.3.0"]),
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
