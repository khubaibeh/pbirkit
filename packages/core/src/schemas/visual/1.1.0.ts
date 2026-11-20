import { Literal, Literals, Struct, Union, optionalKey } from "effect/Schema";

import type { WithoutSchema } from "#schemas/common/define.ts";
import { FilterType, filterConfiguration } from "#schemas/filter-configuration/shared.ts";
import { DataViewObjectDefinitions, Selector } from "#schemas/formatting-object-definitions/1.1.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { FilterDefinition, QueryExpressionContainer } from "#schemas/semantic-query/1.1.0.ts";
import { Border, VisualHeader, VisualLink } from "#schemas/visual-configuration/1.5.0.ts";
import { visualConfiguration } from "#schemas/visual-configuration/shared.ts";

import { VisualContainerPosition } from "./1.0.0.ts";
import { HowCreatedValues, VisualContainerFields, visualGroupConfig } from "./shared.ts";

export * from "./shared.ts";
export { VisualContainerPosition };

export const HowCreated = Literals([...HowCreatedValues, "SummarizeVisualContainer"]);

export type HowCreated = typeof HowCreated.Type;

export const { Query, VisualContainerFormattingObjects, VisualConfiguration } = visualConfiguration(
	{ QueryExpressionContainer, Selector, DataViewObjectDefinitions },
	{
		roleFieldParameter: {},
		formatting: { border: Border, visualHeader: VisualHeader, visualLink: VisualLink },
	},
);

export type VisualContainerFormattingObjects = typeof VisualContainerFormattingObjects.Type;
export type VisualConfiguration = typeof VisualConfiguration.Type;

export const VisualGroupConfig = visualGroupConfig(Selector);

export type VisualGroupConfig = typeof VisualGroupConfig.Type;

export const { FilterConfig } = filterConfiguration({
	QueryExpressionContainer,
	FilterDefinition,
	Selector,
	FilterType,
});

export type FilterConfig = typeof FilterConfig.Type;

const fields = {
	$schema: Literal(SchemaUrl.visual["1.1.0"]),
	...VisualContainerFields,
	position: VisualContainerPosition,
	filterConfig: optionalKey(FilterConfig),
	howCreated: optionalKey(HowCreated),
};

export const Visual = Union([
	Struct({ ...fields, visual: VisualConfiguration }),
	Struct({ ...fields, visualGroup: VisualGroupConfig }),
]);

export type Visual = typeof Visual.Type;

export const defineVisual = (visual: WithoutSchema<Visual>): Visual => ({
	$schema: fields.$schema.literal,
	...visual,
});
