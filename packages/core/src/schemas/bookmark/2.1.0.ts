import { Literal, Struct, optionalKey } from "effect/Schema";

import {
	DataRepetitionSelector,
	DataViewObjectDefinitions,
	Selector,
} from "#schemas/formatting-object-definitions/1.5.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import {
	FilterDefinition,
	QueryExpressionContainer,
	QuerySortClause,
} from "#schemas/semantic-query/1.4.0.ts";

import { ParameterSortFields } from "./1.4.0.ts";
import { BookmarkFields, bookmarkDefinitions, filterMetadata } from "./shared.ts";

export * from "./shared.ts";
export { ParameterSortFields };

export const { FilterLabelIdPair, FilterExpressionMetadata } = filterMetadata({
	QueryExpressionContainer,
	DataRepetitionSelector,
});

export type FilterLabelIdPair = typeof FilterLabelIdPair.Type;
export type FilterExpressionMetadata = typeof FilterExpressionMetadata.Type;

export const {
	FilterContainerState,
	FiltersState,
	DataViewObjectDefinitionUpdates,
	ParameterState,
	SingleVisualConfigState,
	HighlightState,
	VisualContainerState,
	SectionState,
	ExplorationState,
} = bookmarkDefinitions(
	{
		QueryExpressionContainer,
		FilterDefinition,
		QuerySortClause,
		DataRepetitionSelector,
		DataViewObjectDefinitions,
	},
	{
		parameterState: ParameterSortFields,
		propertyIdSelector: { selector: optionalKey(Selector) },
		FilterLabelIdPair,
		FilterExpressionMetadata,
	},
);

export const Bookmark = Struct({
	$schema: Literal(SchemaUrl.bookmark["2.1.0"]),
	...BookmarkFields,
	explorationState: ExplorationState,
});

export type Bookmark = typeof Bookmark.Type;

export type FilterContainerState = typeof FilterContainerState.Type;

export type FiltersState = typeof FiltersState.Type;

export type DataViewObjectDefinitionUpdates = typeof DataViewObjectDefinitionUpdates.Type;

export type ParameterState = typeof ParameterState.Type;

export type SingleVisualConfigState = typeof SingleVisualConfigState.Type;

export type HighlightState = typeof HighlightState.Type;

export type VisualContainerState = typeof VisualContainerState.Type;

export type SectionState = typeof SectionState.Type;

export type ExplorationState = typeof ExplorationState.Type;

export const defineBookmark = (bookmark: Omit<Bookmark, "$schema">): Bookmark => ({
	$schema: Bookmark.fields.$schema.literal,
	...bookmark,
});
