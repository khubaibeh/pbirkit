import type { Expression } from "./expression.ts";

export const ComparisonKind = { eq: 0, gt: 1, gte: 2, lt: 3, lte: 4 } as const;

export type ComparisonKind = (typeof ComparisonKind)[keyof typeof ComparisonKind];

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

export const eq = comparison(ComparisonKind.eq);
export const gt = comparison(ComparisonKind.gt);
export const gte = comparison(ComparisonKind.gte);
export const lt = comparison(ComparisonKind.lt);
export const lte = comparison(ComparisonKind.lte);

export const and = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	And: { Left, Right },
});

export const or = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	Or: { Left, Right },
});

export const contains = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	Contains: { Left, Right },
});

export const startsWith = <const L extends Expression, const R extends Expression>(Left: L, Right: R) => ({
	StartsWith: { Left, Right },
});

export const not = <const E extends Expression>(Expression: E) => ({ Not: { Expression } });

export const isIn = <
	const E extends ReadonlyArray<Expression>,
	const V extends ReadonlyArray<ReadonlyArray<Expression>>,
>(
	Expressions: E,
	Values: V,
) => ({ In: { Expressions, Values } });

export type Case = readonly [condition: Expression, value: Expression];

export type Cases<C extends ReadonlyArray<Case>> = {
	readonly [I in keyof C]: { readonly Condition: C[I][0]; readonly Value: C[I][1] };
};

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

export const annotate = <const E extends Expression, const A extends Readonly<Record<string, unknown>>>(
	expression: E,
	Annotations: A,
): E & { readonly Annotations: A } => ({ ...expression, Annotations });
