import { DataViewObjectDefinitions, Selector } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { QueryExpressionContainer } from "#schemas/semantic-query/1.4.0.ts";

import { Border, VisualHeader } from "./1.5.0.ts";
import { RoleFieldParameterSortFields } from "./1.8.0.ts";
import { VisualLink } from "./2.2.0.ts";
import { visualConfiguration } from "./shared.ts";

export * from "./shared.ts";
export { Border, RoleFieldParameterSortFields, VisualHeader, VisualLink };

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
