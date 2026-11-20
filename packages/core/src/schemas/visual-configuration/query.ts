import { Array, Boolean, Literals, Number, String, Struct, optionalKey } from "effect/Schema";
import type { Constraint } from "effect/Schema";

export const SortDirection = Literals(["Ascending", "Descending"]);

export type SortDirection = typeof SortDirection.Type;

export const VisualQueryOptions = Struct({
	allowBinnedLineSample: optionalKey(Boolean),
	allowOverlappingPointsSample: optionalKey(Boolean),
});

export type VisualQueryOptions = typeof VisualQueryOptions.Type;

export const sortDefinition = <E extends Constraint>(Expression: E) =>
	Struct({
		sort: optionalKey(Array(Struct({ field: Expression, direction: SortDirection }))),
		isDefaultSort: optionalKey(Boolean),
	});

export const roleProjection = <E extends Constraint>(Expression: E) =>
	Struct({
		field: Expression,
		queryRef: String,
		nativeQueryRef: optionalKey(String),
		displayName: optionalKey(String),
		format: optionalKey(String),
		active: optionalKey(Boolean),
		hidden: optionalKey(Boolean),
	});

export const roleFieldParameterFields = <E extends Constraint>(Expression: E) => ({
	parameterExpr: Expression,
	index: Number,
	length: optionalKey(Number),
});

export const projectionStateFields = <E extends Constraint>(Expression: E) => ({
	showAll: optionalKey(Boolean),
	projections: Array(roleProjection(Expression)),
});

export const queryFields = <E extends Constraint>(Expression: E) => ({
	sortDefinition: optionalKey(sortDefinition(Expression)),
	options: optionalKey(VisualQueryOptions),
	isDrillDisabled: optionalKey(Boolean),
});
