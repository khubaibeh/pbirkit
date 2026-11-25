import { Struct, Unknown, optionalKey } from "effect/Schema";

import { DataViewObjectDefinitions, Selector } from "#schemas/formatting-object-definitions/1.2.0.ts";
import { QueryExpressionContainer } from "#schemas/semantic-query/1.2.0.ts";

import { BorderFields, VisualHeaderFields, VisualLinkFields, visualConfiguration } from "./shared.ts";

export * from "./shared.ts";

/** The `border` container object: the line around the visual. */
export const Border = Struct({
	...BorderFields,
	width: optionalKey(Unknown),
});

export type Border = typeof Border.Type;

export const VisualHeader = Struct({
	...VisualHeaderFields,
	showSetAlertButton: optionalKey(Unknown),
	showFollowVisualButton: optionalKey(Unknown),
});

export type VisualHeader = typeof VisualHeader.Type;

/** The `visualLink` container object: the action that a click on the visual runs. */
export const VisualLink = Struct(VisualLinkFields);

export type VisualLink = typeof VisualLink.Type;

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
export type RoleFieldParameter = typeof RoleFieldParameter.Type;
export type ProjectionState = typeof ProjectionState.Type;
export type ExpansionState = typeof ExpansionState.Type;
