import { Literal, Struct, optionalKey } from "effect/Schema";

import { formattingObjects } from "#schemas/common/formatting.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.1.0.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.3.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";

import { AutoPageGenerationConfig, BindingParameter, PageBinding } from "./1.2.0.ts";
import { PageType } from "./1.3.0.ts";
import { PageFields, PageFormattingProperties, PageVisuals } from "./shared.ts";

export * from "./shared.ts";
export { AutoPageGenerationConfig, BindingParameter, FilterConfig, PageBinding, PageType };

export const PageFormattingObjects = formattingObjects(Selector, PageFormattingProperties);

export type PageFormattingObjects = typeof PageFormattingObjects.Type;

export const Page = Struct({
	$schema: Literal(SchemaUrl.page["1.4.0"]),
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
