import type { Visual } from "pbirkit/schemas/visual/2.13.0";

import { color, font, size } from "#/design.ts";
import { measures } from "#/fields.ts";
import { rail } from "#/lib/layout.ts";
import { sections, sitemap } from "#/sitemap.ts";
import type { PageId } from "#/sitemap.ts";
import { button, tones } from "./button.ts";
import { rect } from "./shape.ts";
import { dynamicText, textBlock } from "./text.ts";

const X = 16;
const WIDTH = rail.width - 2 * X;
const LINK = 30;
const LINK_GAP = 2;
const LABEL = 22;
const SECTION_GAP = 12;
const FIRST_SECTION = 120;

export const navigationRail = (active: PageId): Array<Visual> => {
	const visuals: Array<Visual> = [
		rect({ name: "rail", at: rail, fill: color.surface }),
		rect({ name: "rail-edge", at: { x: rail.width - 1, y: 0, width: 1, height: rail.height }, fill: color.rule }),
		textBlock({
			name: "rail-brand",
			at: { x: 28, y: 30, width: 196, height: 56 },
			paragraphs: [
				[{ text: "Northwind", font: font.display, size: size.brand, color: color.ink }],
				[{ text: "Traders · Sales analytics", size: size.caption, color: color.inkFaint }],
			],
		}),
		rect({ name: "rail-rule", at: { x: 28, y: 98, width: WIDTH - 24, height: 1 }, fill: color.rule }),
	];

	let y = FIRST_SECTION;
	for (const section of sections) {
		visuals.push(
			textBlock({
				name: `rail-section-${section.toLowerCase()}`,
				at: { x: 28, y, width: WIDTH - 12, height: LABEL },
				paragraphs: [[{ text: section.toUpperCase(), font: font.strong, size: size.eyebrow, color: color.inkFaint }]],
			}),
		);
		y += LABEL;
		for (const page of sitemap.filter((entry) => entry.section === section)) {
			const at = { x: X, y, width: WIDTH, height: LINK };
			const current = page.id === active;
			visuals.push(
				button({
					name: `rail-link-${page.id}`,
					at,
					label: "nav" in page ? page.nav : page.title,
					action: { kind: "page", page: page.id },
					tone: current ? tones.railActive : tones.rail,
					bold: current,
				}),
			);
			if (current) visuals.push(rect({ name: "rail-current", at: { ...at, width: 3 }, fill: color.accent }));
			y += LINK + LINK_GAP;
		}
		y += SECTION_GAP;
	}

	visuals.push(
		button({
			name: "rail-clear",
			at: { x: X, y: 952, width: WIDTH, height: 32 },
			label: "Clear all filters",
			action: { kind: "clearSlicers" },
			tone: tones.railQuiet,
			align: "center",
		}),
		dynamicText({
			name: "rail-data-through",
			at: { x: 28, y: 1000, width: WIDTH - 24, height: 40 },
			value: measures.dataThroughLabel,
			size: size.caption,
			color: color.inkFaint,
			background: color.surface,
		}),
	);
	return visuals;
};
