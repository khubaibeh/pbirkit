import { long } from "pbirkit/expr";
import type { Value } from "pbirkit/expr";
import type { Visual } from "pbirkit/schemas/visual/2.13.0";

import { color, font, size } from "#/design.ts";
import { columns } from "#/fields.ts";
import type { Field } from "#/lib/frame.ts";
import { band, content } from "#/lib/layout.ts";
import type { PageEntry } from "#/sitemap.ts";
import { dropdown } from "./slicer.ts";
import { textBlock } from "./text.ts";

export interface Filter {
	readonly field: Field;
	readonly label: string;
	readonly sync?: string;
	readonly single?: boolean;
	readonly selected?: ReadonlyArray<Value>;
}

export const yearFilter: Filter = { field: columns.date.year, label: "Year", sync: "year", selected: [long(2015)] };

export const filterName = (index: number) => `filter-${index + 1}`;

const FILTER_WIDTH = 176;
const FILTER_GAP = 12;
const TITLE_WIDTH = 1040;
const EYEBROW = { y: band.header.y, height: 22 };
const TITLE = { y: EYEBROW.y + EYEBROW.height, height: 46 };
const QUESTION = { y: TITLE.y + TITLE.height, height: 24 };
const FILTER_HEIGHT = 56;
const FILTER_Y = QUESTION.y + QUESTION.height - FILTER_HEIGHT - 4;

export const pageHeader = (page: PageEntry, filters: ReadonlyArray<Filter>): Array<Visual> => {
	const right = content.x + content.width;
	const slicers = filters.map((filter, index) => {
		const fromRight = filters.length - index;
		return dropdown({
			name: filterName(index),
			at: {
				x: right - fromRight * FILTER_WIDTH - (fromRight - 1) * FILTER_GAP,
				y: FILTER_Y,
				width: FILTER_WIDTH,
				height: FILTER_HEIGHT,
			},
			...filter,
		});
	});
	return [
		textBlock({
			name: "header-audience",
			at: { x: content.x, ...EYEBROW, width: TITLE_WIDTH },
			paragraphs: [[{ text: page.audience.toUpperCase(), font: font.strong, size: size.eyebrow, color: color.data }]],
		}),
		textBlock({
			name: "header-title",
			at: { x: content.x, ...TITLE, width: TITLE_WIDTH },
			paragraphs: [[{ text: page.title, font: font.display, size: size.pageTitle, color: color.ink }]],
		}),
		textBlock({
			name: "header-question",
			at: { x: content.x, ...QUESTION, width: TITLE_WIDTH },
			paragraphs: [[{ text: page.question, size: size.subtitle, color: color.inkMuted }]],
		}),
		...slicers,
	];
};
