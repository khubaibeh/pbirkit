import { Array, Literals, Struct, optionalKey } from "effect/Schema";

import { QueryExpressionContainer } from "#schemas/semantic-query/1.2.0.ts";

import { SelectorFields, dataRepetitionSelector, dataViewObjectDefinitions } from "./shared.ts";

export * from "./shared.ts";

export const HierarchyMatching = Literals([0, 1]);

export const DataRepetitionSelector = dataRepetitionSelector(QueryExpressionContainer);

export type DataRepetitionSelector = typeof DataRepetitionSelector.Type;

export const Selector = Struct({
	data: optionalKey(Array(DataRepetitionSelector)),
	...SelectorFields,
	hierarchyMatching: optionalKey(HierarchyMatching),
});

export type Selector = typeof Selector.Type;

export const DataViewObjectDefinitions = dataViewObjectDefinitions(Selector);

export type DataViewObjectDefinitions = typeof DataViewObjectDefinitions.Type;
