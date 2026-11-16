import type { Expression } from "./expression.ts";

export interface EntityRef<E extends string = string> {
	readonly SourceRef: { readonly Entity: E };
}

export interface AliasRef<S extends string = string> {
	readonly SourceRef: { readonly Source: S };
}

export interface ColumnExpression<S = Expression> {
	readonly Column: { readonly Expression: S; readonly Property: string };
}

export interface MeasureExpression<S = Expression> {
	readonly Measure: { readonly Expression: S; readonly Property: string };
}

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

export type Aggregate = keyof typeof Aggregate;

export interface AggregationExpression<E = Expression, F extends Aggregate = Aggregate> {
	readonly Aggregation: { readonly Expression: E; readonly Function: (typeof Aggregate)[F] };
}

export interface VariationExpression<S = Expression> {
	readonly PropertyVariationSource: {
		readonly Expression: S;
		readonly Name: string;
		readonly Property: string;
	};
}

export interface HierarchyExpression<S = Expression> {
	readonly Hierarchy: { readonly Expression: S; readonly Hierarchy: string };
}

export interface HierarchyLevelExpression<E = Expression> {
	readonly HierarchyLevel: { readonly Expression: E; readonly Level: string };
}

export const entity = <const E extends string>(Entity: E): EntityRef<E> => ({ SourceRef: { Entity } });

export const alias = <const S extends string>(Source: S): AliasRef<S> => ({ SourceRef: { Source } });

const source = (from: string | Expression): Expression => (typeof from === "string" ? entity(from) : from);

export function col<const E extends string>(from: E, property: string): ColumnExpression<EntityRef<E>>;
export function col<const S extends Expression>(from: S, property: string): ColumnExpression<S>;
export function col(from: string | Expression, Property: string): ColumnExpression {
	return { Column: { Expression: source(from), Property } };
}

export function measure<const E extends string>(from: E, property: string): MeasureExpression<EntityRef<E>>;
export function measure<const S extends Expression>(from: S, property: string): MeasureExpression<S>;
export function measure(from: string | Expression, Property: string): MeasureExpression {
	return { Measure: { Expression: source(from), Property } };
}

export const agg = <const F extends Aggregate, const E extends Expression>(
	fn: F,
	Expression: E,
): AggregationExpression<E, F> => ({ Aggregation: { Expression, Function: Aggregate[fn] } });

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

export function hierarchy<const E extends string>(from: E, name: string): HierarchyExpression<EntityRef<E>>;
export function hierarchy<const S extends Expression>(from: S, name: string): HierarchyExpression<S>;
export function hierarchy(from: string | Expression, Hierarchy: string): HierarchyExpression {
	return { Hierarchy: { Expression: source(from), Hierarchy } };
}

export const level = <const E extends Expression>(
	Expression: E,
	Level: string,
): HierarchyLevelExpression<E> => ({
	HierarchyLevel: { Expression, Level },
});
