import type { LiteralExpression } from "./literal.ts";

/** One node of an expansion state: its value and the nodes under it. `branch` builds it. */
export interface ExpansionBranch<V extends LiteralExpression, C extends ReadonlyArray<unknown>> {
	readonly identityValues: readonly [V];
	readonly children?: C;
}

/** An expanded node of an expansion state. `toggled` builds it. */
export interface ToggledBranch<
	V extends LiteralExpression,
	C extends ReadonlyArray<unknown>,
> extends ExpansionBranch<V, C> {
	readonly isToggled: true;
}

/**
 * Builds a node of an expansion state, such as `branch(text("North"), toggled(text("Q1")))`.
 * The value must be a literal. The rest are the nodes under it.
 */
export const branch = <const V extends LiteralExpression, const C extends ReadonlyArray<ChainNode>>(
	value: V,
	...children: C
): ExpansionBranch<V, C> =>
	children.length === 0 ? { identityValues: [value] } : { identityValues: [value], children };

/** Builds an expanded node of an expansion state. It is `branch` with `isToggled: true`. */
export const toggled = <const V extends LiteralExpression, const C extends ReadonlyArray<ChainNode>>(
	value: V,
	...children: C
): ToggledBranch<V, C> =>
	children.length === 0
		? { identityValues: [value], isToggled: true }
		: { identityValues: [value], isToggled: true, children };

type ChainNode = ExpansionBranch<LiteralExpression, ReadonlyArray<unknown>>;

/** The type that `nest` builds: each node becomes the only child of the node before it. */
export type Nest<T extends ReadonlyArray<ChainNode>> = T extends readonly [
	infer H extends ChainNode,
	...infer R extends ReadonlyArray<ChainNode>,
]
	? R extends readonly []
		? H
		: Omit<H, "children"> & { readonly children: readonly [Nest<R>] }
	: never;

/**
 * Builds a chain of expansion nodes, where each node is the only child of the node before it.
 *
 * Desktop often saves long single-child chains, for example ten `toggled(nil)` levels under one row.
 * Nested `branch` and `toggled` calls push such a chain far to the right, one indent per level.
 * `nest` lists the chain flat instead, one node per line, and builds the same JSON.
 * The last node keeps its own children, so a chain can still end in a fork.
 *
 * @example
 * Without `nest`, each level adds one more call and one more indent:
 * ```ts
 * branch(
 * 	text("Key Milestones"),
 * 	branch(
 * 		nil,
 * 		toggled(
 * 			nil,
 * 			toggled(nil, toggled(text("Phase 1")), toggled(text("Phase 2"))),
 * 		),
 * 	),
 * )
 * ```
 *
 * With `nest`, the same tree stays flat, and the last node still holds the fork:
 * ```ts
 * nest(
 * 	branch(text("Key Milestones")),
 * 	branch(nil),
 * 	toggled(nil),
 * 	toggled(nil, toggled(text("Phase 1")), toggled(text("Phase 2"))),
 * )
 * ```
 */
export function nest<const T extends readonly [ChainNode, ...Array<ChainNode>]>(...nodes: T): Nest<T>;
export function nest(head: ChainNode, ...rest: ReadonlyArray<ChainNode>): ChainNode {
	const [next, ...tail] = rest;
	return next === undefined ? head : { ...head, children: [nest(next, ...tail)] };
}
