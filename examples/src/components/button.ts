import { entry, long, obj, solid } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

import { color, font, size } from "#/design.ts";
import type { Hex } from "#/design.ts";
import { bare, position, state } from "#/lib/frame.ts";
import type { Placed } from "#/lib/frame.ts";

export type Action = { readonly kind: "page"; readonly page: string } | { readonly kind: "clearSlicers" };

const visualLink = (action: Action) => {
	switch (action.kind) {
		case "page":
			return obj({ show: true, type: "PageNavigation", navigationSection: action.page });
		case "clearSlicers":
			return obj({ show: true, type: "ClearAllSlicers" });
	}
};

export interface ButtonProps extends Placed {
	readonly label: string;
	readonly action: Action;
	readonly tone: {
		readonly text: Hex;
		readonly fill: Hex;
		readonly hoverText: Hex;
		readonly hoverFill: Hex;
		readonly pressText: Hex;
		readonly pressFill: Hex;
		readonly outline?: Hex;
	};
	readonly align?: "left" | "center";
	readonly bold?: boolean;
}

export const button = ({ name, at, label, action, tone, align = "left", bold = false }: ButtonProps) =>
	defineVisual({
		name,
		position: position(at),
		visual: {
			visualType: "actionButton",
			objects: {
				shape: obj({ tileShape: "rectangleRoundedByPixel", rectangleRoundedCurve: long(4) }),
				fill: [
					entry({ show: true }),
					entry({ fillColor: solid(tone.fill), transparency: 0 }, state.default),
					entry({ fillColor: solid(tone.hoverFill), transparency: 0 }, state.hover),
					entry({ fillColor: solid(tone.pressFill), transparency: 0 }, state.selected),
				],
				text: [
					entry({ show: true }),
					entry(
						{
							text: label,
							fontFamily: bold ? font.strong : font.body,
							fontSize: size.nav,
							fontColor: solid(tone.text),
							horizontalAlignment: align,
							verticalAlignment: "middle",
							leftMargin: long(align === "left" ? 14 : 0),
						},
						state.default,
					),
					entry({ fontColor: solid(tone.hoverText) }, state.hover),
					entry({ fontColor: solid(tone.pressText) }, state.selected),
				],
				icon: [entry({ show: false })],
				outline:
					tone.outline === undefined
						? [entry({ show: false })]
						: [
								entry({ show: true }),
								entry({ lineColor: solid(tone.outline), weight: 1, transparency: 0 }, state.default),
								entry({ lineColor: solid(tone.outline), weight: 1, transparency: 0 }, state.selected),
							],
			},
			visualContainerObjects: { ...bare(label), visualLink: visualLink(action) },
		},
	});

const pressed = { pressText: color.data, pressFill: color.dataWash } as const;

export const tones = {
	rail: { text: color.inkMuted, fill: color.surface, hoverText: color.ink, hoverFill: color.paper, ...pressed },
	railActive: { text: color.data, fill: color.dataWash, hoverText: color.data, hoverFill: color.dataWash, ...pressed },
	railQuiet: {
		text: color.ink,
		fill: color.surface,
		hoverText: color.ink,
		hoverFill: color.paper,
		...pressed,
		outline: color.ruleStrong,
	},
} as const satisfies Record<string, ButtonProps["tone"]>;
