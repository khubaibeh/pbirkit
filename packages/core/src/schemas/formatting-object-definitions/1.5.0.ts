import { Array, Struct, optionalKey } from "effect/Schema";

import { QueryExpressionContainer } from "#schemas/semantic-query/1.4.0.ts";

import { HierarchyMatching } from "./1.3.0.ts";
import { SelectorFields, dataRepetitionSelector, dataViewObjectDefinitions } from "./shared.ts";

export * from "./shared.ts";

export { HierarchyMatching };

/** A data selector: which data points a formatting entry applies to. */
export const DataRepetitionSelector = dataRepetitionSelector(QueryExpressionContainer);

export type DataRepetitionSelector = typeof DataRepetitionSelector.Type;

/**
 * Picks what a formatting entry applies to. Leave it out to format the whole object.
 *
 * - `data`: Matches data points in the visual.
 * - `hierarchyMatching`: How the selector matches values in a hierarchy.
 */
export const Selector = Struct({
	data: optionalKey(Array(DataRepetitionSelector)),
	...SelectorFields,
	hierarchyMatching: optionalKey(HierarchyMatching),
});

export type Selector = typeof Selector.Type;

/** The `objects` block of a visual: object names mapped to lists of selector and property pairs. */
export const DataViewObjectDefinitions = dataViewObjectDefinitions(Selector);

export type DataViewObjectDefinitions = typeof DataViewObjectDefinitions.Type;
