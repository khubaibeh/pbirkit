import { Array, Struct, optionalKey } from "effect/Schema";

import { QueryExpressionContainer } from "#schemas/semantic-query/1.4.0.ts";

import { HierarchyMatching } from "./1.3.0.ts";
import { SelectorFields, dataRepetitionSelector, dataViewObjectDefinitions } from "./shared.ts";

export * from "./shared.ts";

export { HierarchyMatching };

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
