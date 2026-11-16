import { optionalKey } from "effect/Schema";

import { DataViewObjectDefinitions, Selector } from "#schemas/formatting-object-definitions/1.3.0.ts";
import { QueryExpressionContainer } from "#schemas/semantic-query/1.2.0.ts";

import { Border, VisualHeader, VisualLink } from "./1.5.0.ts";
import { SortDirection, visualConfiguration } from "./shared.ts";

export * from "./shared.ts";
export { Border, VisualHeader, VisualLink };

export const RoleFieldParameterSortFields = {
	sortDirection: optionalKey(SortDirection),
};

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
		formatting: { border: Border, visualHeader: VisualHeader, visualLink: VisualLink },
	},
);

export type Query = typeof Query.Type;
export type VisualContainerFormattingObjects = typeof VisualContainerFormattingObjects.Type;
export type VisualConfiguration = typeof VisualConfiguration.Type;
