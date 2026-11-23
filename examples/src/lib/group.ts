import { obj } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";
import type { Visual } from "pbirkit/schemas/visual/2.13.0";

import { position } from "./frame.ts";

const bounds = (visuals: ReadonlyArray<Visual>) => {
	const left = Math.min(...visuals.map(({ position: at }) => at.x));
	const top = Math.min(...visuals.map(({ position: at }) => at.y));
	const right = Math.max(...visuals.map(({ position: at }) => at.x + at.width));
	const bottom = Math.max(...visuals.map(({ position: at }) => at.y + at.height));
	return { x: left, y: top, width: right - left, height: bottom - top };
};

const shift = (visual: Visual, by: { readonly x: number; readonly y: number }): Visual => ({
	...visual,
	position: { ...visual.position, x: visual.position.x + by.x, y: visual.position.y + by.y },
});

export const group = (name: string, label: string, children: ReadonlyArray<Visual>): Array<Visual> => {
	const direct = children.filter((child) => child.parentGroupName === undefined);
	if (direct.length === 0) throw new RangeError(`group "${name}": give at least one visual`);
	const box = bounds(direct);
	return [
		defineVisual({
			name,
			position: position(box),
			visualGroup: { displayName: label, groupMode: "ScaleMode", objects: { background: obj({ show: false }) } },
		}),
		...children.map((child) =>
			child.parentGroupName === undefined
				? { ...shift(child, { x: -box.x, y: -box.y }), parentGroupName: name }
				: child,
		),
	];
};
