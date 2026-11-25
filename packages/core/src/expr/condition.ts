import type { Expression } from "./expression.ts";

/** The comparison operators, mapped to the numbers Power BI writes. */
export const ComparisonKind = { eq: 0, gt: 1, gte: 2, lt: 3, lte: 4 } as const;

/** One comparison operator number. */
export type ComparisonKind = (typeof ComparisonKind)[keyof typeof ComparisonKind];

/** A comparison of `Left` and `Right`. `eq`, `gt`, `gte`, `lt` and `lte` build it. */
export interface ComparisonExpression<
	K extends ComparisonKind = ComparisonKind,
	L = Expression,
	R = Expression,
> {
	readonly Comparison: { readonly ComparisonKind: K; readonly Left: L; readonly Right: R };
}

const comparison =
	<const K extends ComparisonKind>(kind: K) =>
	<const L extends Expression, const R extends Expression>(
		Left: L,
		Right: R,
	): ComparisonExpression<K, L, R> => ({
		Comparison: { ComparisonKind: kind, Left, Right },
	});

/** Builds `Left = Right`. */
export const eq = comparison(ComparisonKind.eq);
/** Builds `Left > Right`. */
export const gt = comparison(ComparisonKind.gt);
/** Builds `Left >= Right`. */
export const gte = comparison(ComparisonKind.gte);
/** Builds `Left < Right`. */
export const lt = comparison(ComparisonKind.lt);
/** Builds `Left <= Right`. */
export const lte = comparison(ComparisonKind.lte);

/** Builds a condition that is true when both conditions are true. */
export const and = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	And: { Left, Right },
});

/** Builds a condition that is true when either condition is true. */
export const or = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	Or: { Left, Right },
});

/** Builds a condition that is true when the `Left` text contains the `Right` text. It ignores case. */
export const contains = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	Contains: { Left, Right },
});

/** Builds a condition that is true when the `Left` text starts with the `Right` text. */
export const startsWith = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	StartsWith: { Left, Right },
});

/** Builds the opposite of a condition. */
export const not = <const E extends Expression>(Expression: E) => ({ Not: { Expression } });

/**
 * Builds a condition that is true when the tuple of `Expressions` matches one tuple in `Values`.
 * For one field, pass `[field]` and one single-item tuple per value.
 */
export const isIn = <
	const E extends ReadonlyArray<Expression>,
	const V extends ReadonlyArray<ReadonlyArray<Expression>>,
>(
	Expressions: E,
	Values: V,
) => ({ In: { Expressions, Values } });

/** One case of `when`: a condition and the value to use when it is true. */
export type Case = readonly [condition: Expression, value: Expression];

/** The `Cases` that `when` writes from its case tuples. */
export type Cases<C extends ReadonlyArray<Case>> = {
	readonly [I in keyof C]: { readonly Condition: C[I][0]; readonly Value: C[I][1] };
};

/**
 * Builds a conditional value: the value of the first true case, else `fallback`, else null.
 * For a conditional color, wrap it in `solid(...)` and use text values for the colors.
 * Desktop ignores a rule without `solid(...)`.
 */
export function when<const C extends ReadonlyArray<Case>>(
	cases: C,
): { readonly Conditional: { readonly Cases: Cases<C> } };
export function when<const C extends ReadonlyArray<Case>, const D extends Expression>(
	cases: C,
	fallback: D,
): { readonly Conditional: { readonly Cases: Cases<C>; readonly DefaultValue: D } };
export function when(cases: ReadonlyArray<Case>, fallback?: Expression): unknown {
	const Cases = cases.map(([Condition, Value]) => ({ Condition, Value }));
	return { Conditional: fallback === undefined ? { Cases } : { Cases, DefaultValue: fallback } };
}

/** Returns the expression with `Annotations` added. */
export const annotate = <const E extends Expression, const A extends Readonly<Record<string, unknown>>>(
	expression: E,
	Annotations: A,
): E & { readonly Annotations: A } => ({ ...expression, Annotations });
