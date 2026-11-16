import { Array, Boolean, Literals, String, Struct, optionalKey, suspend } from "effect/Schema";
import type { Codec } from "effect/Schema";

export interface NodeExpansionState<E> {
	readonly identityValues: ReadonlyArray<E>;
	readonly isToggled?: boolean;
	readonly children?: ReadonlyArray<NodeExpansionState<E>>;
}

export const AIDecompositionMethod = Literals(["BestSplit", "MaxSplit", "MinSplit"]);

export const AILevelInformation = Struct({
	method: AIDecompositionMethod,
	disabled: optionalKey(Boolean),
});

export type AILevelInformation = typeof AILevelInformation.Type;

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
