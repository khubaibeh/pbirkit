import { Literal, Literals, Struct, Union, optionalKey } from "effect/Schema";

import type { WithoutSchema } from "#schemas/common/define.ts";
import { FilterTypeValues, filterConfiguration } from "#schemas/filter-configuration/shared.ts";
import { DataViewObjectDefinitions, Selector } from "#schemas/formatting-object-definitions/1.0.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { FilterDefinition, QueryExpressionContainer } from "#schemas/semantic-query/1.0.0.ts";
import { VisualLink } from "#schemas/visual-configuration/1.5.0.ts";
import {
	BorderFields,
	VisualHeaderFields,
	visualConfiguration,
} from "#schemas/visual-configuration/shared.ts";

import { HowCreatedValues, PositionFields, VisualContainerFields, visualGroupConfig } from "./shared.ts";

export * from "./shared.ts";

export const HowCreated = Literals(HowCreatedValues);

export const VisualContainerPosition = Struct(PositionFields);

export type VisualContainerPosition = typeof VisualContainerPosition.Type;

export const Border = Struct(BorderFields);

export const VisualHeader = Struct(VisualHeaderFields);

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
	FilterType: Literals(FilterTypeValues),
});

export type FilterConfig = typeof FilterConfig.Type;

const fields = {
	$schema: Literal(SchemaUrl.visual["1.0.0"]),
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
