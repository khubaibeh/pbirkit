import { obj, solid } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

import type { Hex } from "#/design.ts";
import { bare, position, state } from "#/lib/frame.ts";
import type { Placed } from "#/lib/frame.ts";

export interface RectProps extends Placed {
	readonly fill: Hex;
	readonly radius?: number;
}

export const rect = ({ name, at, fill, radius = 0 }: RectProps) =>
	defineVisual({
		name,
		position: position(at),
		visual: {
			visualType: "shape",
			objects: {
				shape: obj(
					radius === 0
						? { tileShape: "rectangle" }
						: { tileShape: "rectangleRoundedByPixel", rectangleRoundedCurve: radius },
				),
				fill: obj({ show: true, fillColor: solid(fill), transparency: 0 }, state.default),
				outline: obj({ show: false }),
			},
			visualContainerObjects: bare,
		},
	});
