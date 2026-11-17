import { Literal, Struct } from "effect/Schema";

import {
	DataRepetitionSelector,
	DataViewObjectDefinitions,
	Selector,
} from "#schemas/formatting-object-definitions/1.1.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import {
	FilterDefinition,
	QueryExpressionContainer,
	QuerySortClause,
} from "#schemas/semantic-query/1.1.0.ts";

import { BookmarkFields, UntypedFilterMetadata, bookmarkDefinitions } from "./shared.ts";

export * from "./shared.ts";

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
	{ parameterState: {}, propertyIdSelector: { selector: Selector }, ...UntypedFilterMetadata },
);

export const Bookmark = Struct({
	$schema: Literal(SchemaUrl.bookmark["1.1.0"]),
	...BookmarkFields,
	explorationState: ExplorationState,
});

export type Bookmark = typeof Bookmark.Type;

export const defineBookmark = (bookmark: Omit<Bookmark, "$schema">): Bookmark => ({
	$schema: Bookmark.fields.$schema.literal,
	...bookmark,
});
