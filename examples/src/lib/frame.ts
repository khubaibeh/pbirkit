import { obj } from "pbirkit/expr";
import type { ColumnExpression, EntityRef, MeasureExpression } from "pbirkit/expr";

import type { Rect } from "./layout.ts";

export type Field = ColumnExpression<EntityRef> | MeasureExpression<EntityRef>;

export interface Placed {
	readonly name: string;
	readonly at: Rect;
}

export interface Titled {
	readonly title?: string | undefined;
	readonly subtitle?: string | undefined;
}

export const position = (at: Rect) => ({
	x: at.x,
	y: at.y,
	z: 0,
	width: at.width,
	height: at.height,
	tabOrder: 0,
});

export const titles = ({ title, subtitle }: Titled) => ({
	title: title === undefined ? obj({ show: false }) : obj({ show: true, text: title }),
	subTitle: subtitle === undefined ? obj({ show: false }) : obj({ show: true, text: subtitle }),
});

export const state = {
	default: { id: "default" },
	hover: { id: "hover" },
	selected: { id: "selected" },
} as const;

export const bare = {
	background: obj({ show: false }),
	border: obj({ show: false }),
	title: obj({ show: false }),
	subTitle: obj({ show: false }),
	visualHeader: obj({ show: false }),
	padding: obj({ top: 0, bottom: 0, left: 0, right: 0 }),
};
