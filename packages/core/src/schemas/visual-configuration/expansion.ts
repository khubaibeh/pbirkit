import { Array, Boolean, Literals, String, Struct, optionalKey, suspend } from "effect/Schema";
import type { Codec } from "effect/Schema";

/**
 * One expanded or collapsed value in a hierarchy, with the values under it.
 *
 * - `identityValues`: The values that pick the node. Use literal expressions.
 * - `isToggled`: True when the node is expanded.
 * - `children`: The nodes under it with their own state.
 */
export interface NodeExpansionState<E> {
	readonly identityValues: ReadonlyArray<E>;
	readonly isToggled?: boolean;
	readonly children?: ReadonlyArray<NodeExpansionState<E>>;
}

/** How an AI split in a decomposition tree picks the next value. */
export const AIDecompositionMethod = Literals(["BestSplit", "MaxSplit", "MinSplit"]);

export type AIDecompositionMethod = typeof AIDecompositionMethod.Type;

/**
 * The AI split of one decomposition tree level.
 *
 * - `method`: How the split picks the next value.
 * - `disabled`: When true, the level is off.
 */
export const AILevelInformation = Struct({
	method: AIDecompositionMethod,
	disabled: optionalKey(Boolean),
});

export type AILevelInformation = typeof AILevelInformation.Type;

/**
 * Builds the schema of an expansion state: which values a hierarchy visual expands, such as a matrix.
 *
 * - `roles`: The roles with expanded values.
 * - `root`: The top node. Its `identityValues` may be empty. `children` holds the expanded values below.
 * - `levels`: One entry per field in the hierarchy.
 * - `levels[].queryRefs`: The fields of the level. Each must match a `queryRef` in the query.
 * - `levels[].identityKeys`: The fields of the level, as expressions.
 * - `levels[].isCollapsed`: True when the whole level is not expanded.
 * - `levels[].isPinned`: True when the level is pinned.
 * - `levels[].isLocked`: True when the level is locked, in a decomposition tree.
 * - `levels[].AIInformation`: The AI split of the level, in a decomposition tree.
 */
export const expansionState = <E>(Expression: Codec<E>) => {
	const NodeExpansionState: Codec<NodeExpansionState<E>> = Struct({
		identityValues: Array(Expression),
		isToggled: optionalKey(Boolean),
		children: optionalKey(Array(suspend((): Codec<NodeExpansionState<E>> => NodeExpansionState))),
	});

	const RootExpansionState = Struct({
		identityValues: optionalKey(Array(Expression)),
		isToggled: optionalKey(Boolean),
		children: optionalKey(Array(NodeExpansionState)),
	});

	const LevelExpansionState = Struct({
		identityKeys: optionalKey(Array(Expression)),
		isCollapsed: optionalKey(Boolean),
		queryRefs: Array(String),
		isPinned: optionalKey(Boolean),
		isLocked: optionalKey(Boolean),
		AIInformation: optionalKey(AILevelInformation),
	});

	return Struct({
		roles: Array(String),
		root: optionalKey(RootExpansionState),
		levels: optionalKey(Array(LevelExpansionState)),
	});
};
