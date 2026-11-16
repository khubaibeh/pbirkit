import { Array, Literals, Number, Record, String, Struct, Unknown, optionalKey } from "effect/Schema";
import type { Constraint } from "effect/Schema";

export const HighlightMatching = Literals([0, 1, 2]);

export const DataViewWildcardMatchingOption = Literals([0, 1, 2]);

export const DataViewWildcard = Struct({
	matchingOption: DataViewWildcardMatchingOption,
});

export type DataViewWildcard = typeof DataViewWildcard.Type;

export const DataViewObjectPropertyDefinitions = Record(String, Unknown);

export const dataRepetitionSelector = <E extends Constraint>(Expression: E) =>
	Struct({
		scopeId: optionalKey(Expression),
		wildcard: optionalKey(Array(Expression)),
		roles: optionalKey(Array(String)),
		total: optionalKey(Array(Expression)),
		dataViewWildcard: optionalKey(DataViewWildcard),
	});

export const SelectorFields = {
	metadata: optionalKey(String),
	id: optionalKey(String),
	highlightMatching: optionalKey(HighlightMatching),
	order: optionalKey(Number),
};

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
