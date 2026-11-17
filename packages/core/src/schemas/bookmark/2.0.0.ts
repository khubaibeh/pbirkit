import { Literal, Struct, optionalKey } from "effect/Schema";

import {
	DataRepetitionSelector,
	DataViewObjectDefinitions,
	Selector,
} from "#schemas/formatting-object-definitions/1.4.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import {
	FilterDefinition,
	QueryExpressionContainer,
	QuerySortClause,
} from "#schemas/semantic-query/1.3.0.ts";

import { FilterExpressionMetadata, FilterLabelIdPair, ParameterSortFields } from "./1.4.0.ts";
import { BookmarkFields, bookmarkDefinitions } from "./shared.ts";

export * from "./shared.ts";
export { FilterExpressionMetadata, FilterLabelIdPair, ParameterSortFields };

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
	$schema: Literal(SchemaUrl.bookmark["2.0.0"]),
	...BookmarkFields,
	explorationState: ExplorationState,
});

export type Bookmark = typeof Bookmark.Type;

export const defineBookmark = (bookmark: Omit<Bookmark, "$schema">): Bookmark => ({
	$schema: Bookmark.fields.$schema.literal,
	...bookmark,
});
