import type { Visual } from "pbirkit/schemas/visual/2.13.0";

export const stack = (visuals: ReadonlyArray<Visual>): Array<Visual> => {
	const placed = new Map<string | undefined, number>();
	return visuals.map((visual, index) => {
		const layer = (placed.get(visual.parentGroupName) ?? 0) + 1;
		placed.set(visual.parentGroupName, layer);
		return { ...visual, position: { ...visual.position, z: layer * 1000, tabOrder: (index + 1) * 1000 } };
	});
};
