import { double, gt, lt, solid, text, when } from "pbirkit/expr";

import { color } from "#/design.ts";
import type { Hex } from "#/design.ts";
import type { Field } from "./frame.ts";

export const bySign = (field: Field, tones: { readonly up?: Hex; readonly down?: Hex; readonly flat?: Hex } = {}) => {
	const { up = color.good, down = color.bad, flat = color.inkMuted } = tones;
	return solid(
		when(
			[
				[gt(field, double(0)), text(up)],
				[lt(field, double(0)), text(down)],
			],
			text(flat),
		),
	);
};

export const scale = (field: Field, low: Hex, high: Hex) => ({
	solid: {
		color: {
			expr: {
				FillRule: {
					Input: field,
					FillRule: {
						linearGradient2: {
							min: { color: text(low) },
							max: { color: text(high) },
							nullColoringStrategy: { strategy: text("noColor") },
						},
					},
				},
			},
		},
	},
});
