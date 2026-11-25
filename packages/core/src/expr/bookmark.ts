import type { Expression } from "./expression.ts";

/** How a bookmark filter came to be, as the number that bookmark state writes. */
export type HowCreated = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** One filter in bookmark state. */
export interface FilterState<N extends string, T extends string, E extends Expression, F> {
	readonly name: N;
	readonly type: T;
	readonly filter?: F;
	readonly expression: E;
	readonly howCreated: HowCreated;
}

/** Builds one filter in bookmark state: its name, type, field, how it came to be, and its filter query. */
export const filterState = <
	const N extends string,
	const T extends string,
	const E extends Expression,
	const F = never,
>(
	name: N,
	type: T,
	expression: E,
	howCreated: HowCreated,
	filter?: F,
): FilterState<N, T, E, F> =>
	filter === undefined
		? { name, type, expression, howCreated }
		: { name, type, filter, expression, howCreated };
