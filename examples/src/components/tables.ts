import { desc, entry, forField, obj, project, role, solid, sort, v, wildcard } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

import { color, sequential } from "#/design.ts";
import type { VisualFilter } from "#/lib/filters.ts";
import { bySign, scale } from "#/lib/format.ts";
import { position, titles } from "#/lib/frame.ts";
import type { Field, Placed, Titled } from "#/lib/frame.ts";

export type Emphasis = "bar" | "signed" | "heat";

export interface TableColumn {
	readonly field: Field;
	readonly label?: string;
	readonly emphasis?: Emphasis;
}

const projectColumn = ({ field, label }: TableColumn) =>
	label === undefined ? project(field) : project(field, { displayName: label });

const CHROME = 72;
const LABEL_SHARE = 1.8;
const ROW_HEADER = 140;

const widths = (columns: ReadonlyArray<TableColumn>, panelWidth: number) => {
	const weight = (index: number) => (index === 0 ? LABEL_SHARE : 1);
	const shares = columns.reduce((sum, _, index) => sum + weight(index), 0);
	const share = Math.max(0, panelWidth - CHROME) / Math.max(shares, 1);
	return columns.map(({ field }, index) => entry({ value: Math.floor(share * weight(index)) }, forField(field)));
};

const dataBars = (field: Field) =>
	entry(
		{
			dataBars: {
				positiveColor: solid(color.dataWash),
				negativeColor: solid(color.badWash),
				axisColor: solid(color.ruleStrong),
				reverseDirection: v(false),
				hideText: v(false),
			},
		},
		forField(field),
	);

const wash = (field: Field, kind: Emphasis | undefined) =>
	kind === "heat" ? scale(field, sequential.low, color.dataSoft) : undefined;

const emphasis = (columns: ReadonlyArray<TableColumn>) => {
	const bars = columns.filter((column) => column.emphasis === "bar").map(({ field }) => dataBars(field));
	const fonts = columns
		.filter((column) => column.emphasis === "signed")
		.map(({ field }) => entry({ fontColor: bySign(field) }, wildcard(field)));
	const washes = columns.flatMap(({ field, emphasis: kind }) => {
		const backColor = wash(field, kind);
		return backColor === undefined ? [] : [entry({ backColor }, wildcard(field))];
	});
	return { columnFormatting: bars, values: [...fonts, ...washes] };
};

export interface TableProps extends Placed, Titled {
	readonly columns: ReadonlyArray<TableColumn>;
	readonly sortBy?: Field;
	readonly filters?: ReadonlyArray<VisualFilter>;
}

export const table = ({ name, at, title, subtitle, columns, sortBy, filters }: TableProps) => {
	const { columnFormatting, values } = emphasis(columns);
	const columnWidth = widths(columns, at.width);
	return defineVisual({
		name,
		position: position(at),
		...(filters === undefined || filters.length === 0 ? {} : { filterConfig: { filters: [...filters] } }),
		visual: {
			visualType: "tableEx",
			query: {
				queryState: { Values: role(...columns.map(projectColumn)) },
				...(sortBy === undefined ? {} : { sortDefinition: sort(desc(sortBy)) }),
			},
			objects: {
				total: obj({ totals: true }),
				...(columnFormatting.length === 0 ? {} : { columnFormatting }),
				...(values.length === 0 ? {} : { values }),
				columnWidth,
			},
			visualContainerObjects: titles({ title, subtitle }),
			drillFilterOtherVisuals: true,
		},
	});
};

export interface MatrixProps extends Placed, Titled {
	readonly rows: ReadonlyArray<Field>;
	readonly columns?: ReadonlyArray<Field>;
	readonly values: ReadonlyArray<TableColumn>;
	readonly cellWidth?: number;
	readonly totals?: boolean;
}

export const matrix = ({
	name,
	at,
	title,
	subtitle,
	rows,
	columns = [],
	values: cells,
	cellWidth,
	totals = true,
}: MatrixProps) => {
	const { columnFormatting, values } = emphasis(cells);
	const fill = columns.length === 0 ? Math.floor((at.width - CHROME - ROW_HEADER) / cells.length) : undefined;
	const width = cellWidth ?? fill;
	return defineVisual({
		name,
		position: position(at),
		visual: {
			visualType: "pivotTable",
			query: {
				queryState: {
					Rows: role(...rows.map((field) => project(field))),
					...(columns.length === 0 ? {} : { Columns: role(...columns.map((field) => project(field))) }),
					Values: role(...cells.map(projectColumn)),
				},
			},
			objects: {
				subTotals: obj({ rowSubtotals: totals, columnSubtotals: totals }),
				rowHeaders: obj({ showExpandCollapseButtons: false, stepped: true }),
				...(columnFormatting.length === 0 ? {} : { columnFormatting }),
				...(values.length === 0 ? {} : { values }),
				...(width === undefined
					? {}
					: { columnWidth: cells.map(({ field }) => entry({ value: width }, forField(field))) }),
			},
			visualContainerObjects: titles({ title, subtitle }),
			drillFilterOtherVisuals: true,
		},
	});
};
