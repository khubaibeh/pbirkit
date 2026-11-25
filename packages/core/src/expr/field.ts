import type { Expression } from "./expression.ts";

/** A model table, by name. `entity` builds it. */
export interface EntityRef<E extends string = string> {
	readonly SourceRef: { readonly Entity: E };
}

/** A table, by its query alias. `alias` builds it. */
export interface AliasRef<S extends string = string> {
	readonly SourceRef: { readonly Source: S };
}

/** A column of a table. `col` builds it. */
export interface ColumnExpression<S = Expression> {
	readonly Column: { readonly Expression: S; readonly Property: string };
}

/** A measure of a table. `measure` builds it. */
export interface MeasureExpression<S = Expression> {
	readonly Measure: { readonly Expression: S; readonly Property: string };
}

/**
 * The aggregate names that `agg` takes, mapped to the numbers Power BI writes.
 * `count` is the distinct count, and `countNonNull` is the plain count of non-blank values.
 */
export const Aggregate = {
	sum: 0,
	avg: 1,
	count: 2,
	min: 3,
	max: 4,
	countNonNull: 5,
	median: 6,
	standardDeviation: 7,
	variance: 8,
} as const;

/** One aggregate name of `Aggregate`. */
export type Aggregate = keyof typeof Aggregate;

/** An aggregate over an expression. `agg` builds it. */
export interface AggregationExpression<E = Expression, F extends Aggregate = Aggregate> {
	readonly Aggregation: { readonly Expression: E; readonly Function: (typeof Aggregate)[F] };
}

/** A variation of a column, such as the auto date hierarchy. `variation` builds it. */
export interface VariationExpression<S = Expression> {
	readonly PropertyVariationSource: {
		readonly Expression: S;
		readonly Name: string;
		readonly Property: string;
	};
}

/** A hierarchy of a table. `hierarchy` builds it. */
export interface HierarchyExpression<S = Expression> {
	readonly Hierarchy: { readonly Expression: S; readonly Hierarchy: string };
}

/** A level of a hierarchy. `level` builds it. */
export interface HierarchyLevelExpression<E = Expression> {
	readonly HierarchyLevel: { readonly Expression: E; readonly Level: string };
}

/** Builds a reference to a model table, such as `entity("Sales")`. */
export const entity = <const E extends string>(Entity: E): EntityRef<E> => ({ SourceRef: { Entity } });

/** Builds a reference to a table by its query alias, such as `alias("s")`. Filters use it. */
export const alias = <const S extends string>(Source: S): AliasRef<S> => ({ SourceRef: { Source } });

const source = (from: string | Expression): Expression => (typeof from === "string" ? entity(from) : from);

/**
 * Builds a column, such as `col("Customer", "Region")`.
 * `from` is a table name or a table expression, such as `alias("c")`.
 */
export function col<const E extends string>(from: E, property: string): ColumnExpression<EntityRef<E>>;
export function col<const S extends Expression>(from: S, property: string): ColumnExpression<S>;
export function col(from: string | Expression, Property: string): ColumnExpression {
	return { Column: { Expression: source(from), Property } };
}

/**
 * Builds a measure, such as `measure("Sales", "Revenue")`.
 * `from` is a table name or a table expression.
 */
export function measure<const E extends string>(from: E, property: string): MeasureExpression<EntityRef<E>>;
export function measure<const S extends Expression>(from: S, property: string): MeasureExpression<S>;
export function measure(from: string | Expression, Property: string): MeasureExpression {
	return { Measure: { Expression: source(from), Property } };
}

/** Builds an aggregate over a column, such as `agg("sum", col("Sales", "Qty"))`. See `Aggregate` for the names. */
export const agg = <const F extends Aggregate, const E extends Expression>(
	fn: F,
	Expression: E,
): AggregationExpression<E, F> => ({ Aggregation: { Expression, Function: Aggregate[fn] } });

/**
 * Builds the auto date variation of a date column, such as `variation("Orders", "Variation", "OrderDate")`.
 * Wrap it in `hierarchy` and `level` to reach one level, such as the year.
 */
export function variation<const E extends string>(
	from: E,
	name: string,
	property: string,
): VariationExpression<EntityRef<E>>;
export function variation<const S extends Expression>(
	from: S,
	name: string,
	property: string,
): VariationExpression<S>;
export function variation(from: string | Expression, Name: string, Property: string): VariationExpression {
	return { PropertyVariationSource: { Expression: source(from), Name, Property } };
}

/**
 * Builds a hierarchy, such as `hierarchy("Date", "Calendar")`.
 * `from` is a table name, a table expression, or a `variation`.
 */
export function hierarchy<const E extends string>(from: E, name: string): HierarchyExpression<EntityRef<E>>;
export function hierarchy<const S extends Expression>(from: S, name: string): HierarchyExpression<S>;
export function hierarchy(from: string | Expression, Hierarchy: string): HierarchyExpression {
	return { Hierarchy: { Expression: source(from), Hierarchy } };
}

/** Builds a level of a hierarchy, such as `level(hierarchy("Date", "Calendar"), "Year")`. */
export const level = <const E extends Expression>(
	Expression: E,
	Level: string,
): HierarchyLevelExpression<E> => ({
	HierarchyLevel: { Expression, Level },
});
