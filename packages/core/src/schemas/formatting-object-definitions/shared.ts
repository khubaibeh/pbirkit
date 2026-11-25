import { Array, Finite, Literals, optionalKey, Record, String, Struct, Unknown } from "effect/Schema";
import type { Constraint } from "effect/Schema";

/**
 * How a selector treats highlighted values.
 * `0` picks only the plain value. `1` picks the plain value and any highlighted one. `2` picks the highlighted value if one exists, else the plain one.
 */
export const HighlightMatching = Literals([0, 1, 2]);

export type HighlightMatching = typeof HighlightMatching.Type;

/**
 * What a wildcard matches.
 * `0` matches values and totals, `1` matches values only, and `2` matches totals only.
 * `MatchingOption` in `pbirkit/expr` names them.
 */
export const DataViewWildcardMatchingOption = Literals([0, 1, 2]);

export type DataViewWildcardMatchingOption = typeof DataViewWildcardMatchingOption.Type;

/**
 * Matches all values of a field, all totals, or both.
 *
 * - `matchingOption`: What the wildcard matches.
 */
export const DataViewWildcard = Struct({
	matchingOption: DataViewWildcardMatchingOption,
});

export type DataViewWildcard = typeof DataViewWildcard.Type;

/** The properties of one formatting object, keyed by property name. Each value is an expression. */
export const DataViewObjectPropertyDefinitions = Record(String, Unknown);

export type DataViewObjectPropertyDefinitions = typeof DataViewObjectPropertyDefinitions.Type;

/**
 * Builds the schema of a data selector: which data points a formatting entry applies to.
 *
 * - `scopeId`: Matches one data point by a condition, such as product color is red.
 * - `wildcard`: Matches all values of a scope, without subtotals. It is an old form, so use `roles`.
 * - `roles`: Matches all fields in these roles.
 * - `total`: Matches the totals and subtotals.
 * - `dataViewWildcard`: Matches all values, all totals, or both.
 */
export const dataRepetitionSelector = <E extends Constraint>(Expression: E) =>
	Struct({
		scopeId: optionalKey(Expression),
		wildcard: optionalKey(Array(Expression)),
		roles: optionalKey(Array(String)),
		total: optionalKey(Array(Expression)),
		dataViewWildcard: optionalKey(DataViewWildcard),
	});

/**
 * The selector fields that all versions share.
 * A selector picks what a formatting entry applies to. Leave it out to format the whole object.
 * `forField`, `wildcard` and `perField` in `pbirkit/expr` build selectors.
 *
 * - `metadata`: Matches one field, by its `queryRef`.
 * - `id`: Matches a named instance, such as a series or a state like `hover`.
 * - `highlightMatching`: How the selector treats highlighted values.
 * - `order`: The order of entries that set the same property. Higher values come later.
 */
export const SelectorFields = {
	metadata: optionalKey(String),
	id: optionalKey(String),
	highlightMatching: optionalKey(HighlightMatching),
	order: optionalKey(Finite),
};

/**
 * Builds the schema of the `objects` block of a visual.
 * Each key is an object name, such as `labels`. Each value is a list of selector and property pairs.
 * Run `pbirkit visual <type>` to list the objects of a visual type.
 */
export const dataViewObjectDefinitions = <S extends Constraint>(Selector: S) =>
	Record(
		String,
		Array(
			Struct({
				selector: optionalKey(Selector),
				properties: DataViewObjectPropertyDefinitions,
			}),
		),
	);
