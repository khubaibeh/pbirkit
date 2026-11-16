import { Struct, Unknown, optionalKey } from "effect/Schema";

import { DataViewObjectDefinitions, Selector } from "#schemas/formatting-object-definitions/1.2.0.ts";
import { QueryExpressionContainer } from "#schemas/semantic-query/1.2.0.ts";

import { BorderFields, VisualHeaderFields, VisualLinkFields, visualConfiguration } from "./shared.ts";

export * from "./shared.ts";

export const Border = Struct({
	...BorderFields,
	width: optionalKey(Unknown),
});

export const VisualHeader = Struct({
	...VisualHeaderFields,
	showSetAlertButton: optionalKey(Unknown),
	showFollowVisualButton: optionalKey(Unknown),
});

export const VisualLink = Struct(VisualLinkFields);

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
		roleFieldParameter: {},
		formatting: { border: Border, visualHeader: VisualHeader, visualLink: VisualLink },
	},
);

export type Query = typeof Query.Type;
export type VisualContainerFormattingObjects = typeof VisualContainerFormattingObjects.Type;
export type VisualConfiguration = typeof VisualConfiguration.Type;
