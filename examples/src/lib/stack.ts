import type { Visual } from "pbirkit/schemas/visual/2.13.0";

export const stack = (visuals: ReadonlyArray<Visual>): Array<Visual> =>
	visuals.map((visual, index) => ({
		...visual,
		position: { ...visual.position, z: (index + 1) * 1000, tabOrder: (index + 1) * 1000 },
	}));
