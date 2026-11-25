import { Array, Boolean, Finite, Literals, optionalKey, String, Struct } from "effect/Schema";
import type { Constraint } from "effect/Schema";

/** `Ascending` sorts small to big. `Descending` sorts big to small. */
export const SortDirection = Literals(["Ascending", "Descending"]);

export type SortDirection = typeof SortDirection.Type;

/**
 * Query options that only some visuals use.
 *
 * - `allowBinnedLineSample`: When true, line charts use a better sample of the data.
 * - `allowOverlappingPointsSample`: When true, scatter charts use a better sample of the data.
 */
export const VisualQueryOptions = Struct({
	allowBinnedLineSample: optionalKey(Boolean),
	allowOverlappingPointsSample: optionalKey(Boolean),
});

export type VisualQueryOptions = typeof VisualQueryOptions.Type;

/**
 * Builds the schema of the visual sort.
 *
 * - `sort`: The fields to sort by, in order, each with a direction.
 * - `isDefaultSort`: False when the user picks the sort. When true, Power BI may change the sort to suit the
 *   visual.
 */
export const sortDefinition = <E extends Constraint>(Expression: E) =>
	Struct({
		sort: optionalKey(Array(Struct({ field: Expression, direction: SortDirection }))),
		isDefaultSort: optionalKey(Boolean),
	});

/**
 * Builds the schema of one field in a visual role.
 *
 * - `field`: The model field, from the helpers in `pbirkit/expr`.
 * - `queryRef`: A name for the field, unique in the visual. Sorts, expansion states and selectors refer to
 *   it.
 * - `nativeQueryRef`: A second name, unique in the visual. Visual calculations refer to it.
 * - `displayName`: The field name that the visual shows. It defaults to the model name.
 * - `format`: A format string for the field in this visual only.
 * - `active`: When true, the field is the current drill level.
 * - `hidden`: When true, the visual hides the field. Visual calculations use it.
 */
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

/**
 * The fields of a field parameter in a role that all versions share.
 *
 * - `parameterExpr`: The field parameter column from the model.
 * - `index`: The position in `projections` where the parameter fields start.
 * - `length`: How many fields the parameter fills. Power BI computes it again at render.
 */
export const roleFieldParameterFields = <E extends Constraint>(Expression: E) => ({
	parameterExpr: Expression,
	index: Finite,
	length: optionalKey(Finite),
});

/**
 * The fields of one role in `queryState` that all versions share.
 *
 * - `showAll`: When true, the role shows items with no data.
 * - `projections`: The fields in the role, in order.
 */
export const projectionStateFields = <E extends Constraint>(Expression: E) => ({
	showAll: optionalKey(Boolean),
	projections: Array(roleProjection(Expression)),
});

/**
 * The fields of a visual query that all versions share.
 *
 * - `sortDefinition`: How the visual sorts its data.
 * - `options`: Query options that only some visuals use.
 * - `isDrillDisabled`: When true, the visual does not drill. Only some custom visuals read it.
 */
export const queryFields = <E extends Constraint>(Expression: E) => ({
	sortDefinition: optionalKey(sortDefinition(Expression)),
	options: optionalKey(VisualQueryOptions),
	isDrillDisabled: optionalKey(Boolean),
});
