import { Struct } from "effect/Schema";

import { formattingProperties } from "#schemas/common/formatting.ts";
import { DataViewObjectDefinitions, Selector } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { QueryExpressionContainer } from "#schemas/semantic-query/1.4.0.ts";

import { Border } from "./1.5.0.ts";
import { RoleFieldParameterSortFields } from "./1.8.0.ts";
import { VisualLink } from "./2.2.0.ts";
import { VisualHeader } from "./2.5.0.ts";
import { Spacing as SpacingV1_5, VisualTooltip as VisualTooltipV1_5, visualConfiguration } from "./shared.ts";

export * from "./shared.ts";
export { Border, RoleFieldParameterSortFields, VisualHeader, VisualLink };

/** The `spacing` container object, with the extra space settings from 2.6.0. */
export const Spacing = Struct({
	...SpacingV1_5.fields,
	...formattingProperties("spaceAbovePlotArea", "spaceAboveDivider", "spaceAboveSubtitle"),
});

export type Spacing = typeof Spacing.Type;

/** The `visualTooltip` container object, with the sentence and value settings from 2.6.0. */
export const VisualTooltip = Struct({
	...VisualTooltipV1_5.fields,
	...formattingProperties(
		"showTooltipFieldsOnly",
		"showSentenceFormat",
		"sentenceTemplate",
		"showChartSpecificTooltips",
		"showValuesInBold",
	),
});

export type VisualTooltip = typeof VisualTooltip.Type;

/** The `visual` schemas of 2.6.0 and later. See `visualConfiguration` for each one. */
export const {
	RoleFieldParameter,
	ProjectionState,
	Query,
	ExpansionState,
	VisualContainerFormattingObjects,
	VisualConfiguration,
} = visualConfiguration(
	{ QueryExpressionContainer, Selector, DataViewObjectDefinitions },
	{
		roleFieldParameter: RoleFieldParameterSortFields,
		formatting: {
			spacing: Spacing,
			visualTooltip: VisualTooltip,
			border: Border,
			visualHeader: VisualHeader,
			visualLink: VisualLink,
		},
	},
);

export type Query = typeof Query.Type;
export type VisualContainerFormattingObjects = typeof VisualContainerFormattingObjects.Type;
export type VisualConfiguration = typeof VisualConfiguration.Type;
export type RoleFieldParameter = typeof RoleFieldParameter.Type;
export type ProjectionState = typeof ProjectionState.Type;
export type ExpansionState = typeof ExpansionState.Type;
