export interface Rect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export const canvas = { width: 1920, height: 1080 } as const;

export const rail = { x: 0, y: 0, width: 240, height: canvas.height } as const;

export const gutter = 16;

const COLUMNS = 12;
const COLUMN = 120;
const LEFT = rail.width + 32;

export const content = { x: LEFT, width: COLUMNS * COLUMN + (COLUMNS - 1) * gutter } as const;

export const band = {
	header: { y: 20, height: 92 },
	kpi: { y: 124, height: 140 },
	body: { y: 280, height: canvas.height - 280 - 28 },
} as const;

export const columns = (from: number, span: number): Pick<Rect, "x" | "width"> => {
	if (!Number.isInteger(from) || !Number.isInteger(span) || from < 1 || span < 1 || from + span - 1 > COLUMNS)
		throw new RangeError(`columns: ${span} columns from column ${from} do not fit a ${COLUMNS}-column grid`);
	return { x: LEFT + (from - 1) * (COLUMN + gutter), width: span * COLUMN + (span - 1) * gutter };
};

type Row = Pick<Rect, "y" | "height">;

export const rows = <const Weights extends ReadonlyArray<number>>(
	...weights: Weights
): { readonly [Index in keyof Weights]: Row } => {
	if (weights.length === 0 || weights.some((weight) => !(weight > 0)))
		throw new RangeError("rows: give at least one positive weight");
	const free = band.body.height - gutter * (weights.length - 1);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	const heights = weights.map((weight) => Math.floor((free * weight) / total));
	heights[heights.length - 1]! += free - heights.reduce((sum, height) => sum + height, 0);
	let y = band.body.y;
	const placed = heights.map((height) => {
		const row = { y, height };
		y += height + gutter;
		return row;
	});
	return placed as { readonly [Index in keyof Weights]: Row };
};

export const cell = (from: number, span: number, row: Row): Rect => ({
	...columns(from, span),
	...row,
});

export const inset = (area: Rect, by: number): Rect => ({
	x: area.x + by,
	y: area.y + by,
	width: area.width - 2 * by,
	height: area.height - 2 * by,
});

export const splitTop = (area: Rect, height: number, gap = gutter): readonly [Rect, Rect] => {
	if (!(height > 0) || height + gap >= area.height)
		throw new RangeError(`splitTop: a ${height} px strip does not fit a ${area.height} px rect`);
	return [
		{ ...area, height },
		{ ...area, y: area.y + height + gap, height: area.height - height - gap },
	];
};
