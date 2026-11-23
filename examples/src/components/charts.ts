import { asc, desc, double, entry, forField, obj, project, role, solid, sort } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

import { color, size } from "#/design.ts";
import type { VisualFilter } from "#/lib/filters.ts";
import { bySign } from "#/lib/format.ts";
import { position, titles } from "#/lib/frame.ts";
import type { Field, Placed, Titled } from "#/lib/frame.ts";

interface Target {
	readonly value: number;
	readonly label: string;
}

interface ChartProps extends Placed, Titled {
	readonly tooltips?: ReadonlyArray<Field>;
	readonly filters?: ReadonlyArray<VisualFilter>;
}

const tooltipRole = (tooltips: ReadonlyArray<Field> = []) =>
	tooltips.length === 0 ? {} : { Tooltips: role(...tooltips.map((field) => project(field))) };

const filterConfig = (filters: ReadonlyArray<VisualFilter> = []) =>
	filters.length === 0 ? {} : { filterConfig: { filters: [...filters] } };

const referenceLine = (value: number, label: string) =>
	obj(
		{
			show: true,
			displayName: label,
			value: double(value),
			lineColor: solid(color.reference),
			width: 1,
			style: "dashed",
			transparency: 0,
			position: "front",
			dataLabelShow: true,
			dataLabelText: "Name",
			dataLabelColor: solid(color.reference),
			dataLabelHorizontalPosition: "left",
			dataLabelVerticalPosition: "above",
		},
		{ id: "1" },
	);

export interface BarProps extends ChartProps {
	readonly category: Field;
	readonly value: Field;
	readonly signed?: boolean;
	readonly sortBy?: Field | null;
	readonly ascending?: boolean;
	readonly target?: Target;
}

const barParts = (
	{ category, value, signed = false, sortBy = value, ascending = false, target, tooltips }: BarProps,
	padding: number,
) => ({
	query: {
		queryState: {
			Category: role(project(category)),
			Y: role(project(value)),
			...tooltipRole(tooltips),
		},
		...(sortBy === null ? {} : { sortDefinition: sort(ascending ? asc(sortBy) : desc(sortBy)) }),
	},
	objects: {
		dataPoint: [
			entry({ fill: solid(color.data) }, forField(value)),
			...(signed
				? [entry({ fill: bySign(value) }, { data: [{ dataViewWildcard: { matchingOption: 1 as const } }] })]
				: []),
		],
		labels: obj({
			show: true,
			labelPosition: "OutsideEnd",
			color: solid(color.ink),
			labelDisplayUnits: 1,
			enableBackground: false,
		}),
		valueAxis: obj({ show: false, gridlineShow: false }),
		categoryAxis: obj({ show: true, innerPadding: padding }),
		legend: obj({ show: false }),
		...(target === undefined ? {} : { y1AxisReferenceLine: referenceLine(target.value, target.label) }),
	},
});

export const barChart = (props: BarProps) => {
	const { query, objects } = barParts(props, 24);
	return defineVisual({
		name: props.name,
		position: position(props.at),
		...filterConfig(props.filters),
		visual: {
			visualType: "clusteredBarChart",
			query,
			objects,
			visualContainerObjects: titles(props),
			drillFilterOtherVisuals: true,
		},
	});
};

export const columnChart = (props: BarProps) => {
	const { query, objects } = barParts({ sortBy: null, ...props }, 32);
	return defineVisual({
		name: props.name,
		position: position(props.at),
		...filterConfig(props.filters),
		visual: {
			visualType: "clusteredColumnChart",
			query,
			objects,
			visualContainerObjects: titles(props),
			drillFilterOtherVisuals: true,
		},
	});
};

export interface TrendProps extends ChartProps {
	readonly category: Field;
	readonly value: Field;
	readonly comparison?: Field;
	readonly target?: Target;
}

export const trendChart = ({
	name,
	at,
	title,
	subtitle,
	category,
	value,
	comparison,
	target,
	tooltips,
	filters,
}: TrendProps) =>
	defineVisual({
		name,
		position: position(at),
		...filterConfig(filters),
		visual: {
			visualType: "lineChart",
			query: {
				queryState: {
					Category: role(project(category)),
					Y: role(
						project(value, { displayName: "This period" }),
						...(comparison === undefined ? [] : [project(comparison, { displayName: "Last year" })]),
					),
					...tooltipRole(tooltips),
				},
			},
			objects: {
				dataPoint: [
					entry({ fill: solid(color.data) }, forField(value)),
					...(comparison === undefined ? [] : [entry({ fill: solid(color.comparison) }, forField(comparison))]),
				],
				lineStyles: [
					entry({
						strokeWidth: 3,
						showMarker: false,
						lineChartType: "linear",
						areaShow: false,
						areaColor: solid(color.data),
					}),
					...(comparison === undefined
						? []
						: [entry({ strokeWidth: 2, lineStyle: "dashed", areaShow: false }, forField(comparison))]),
				],
				categoryAxis: obj({ show: true, gridlineShow: false }),
				valueAxis: obj({ show: true, gridlineShow: true }),
				legend: obj({ show: comparison !== undefined, position: "TopRight" }),
				labels: obj({ show: false }),
				...(target === undefined ? {} : { y1AxisReferenceLine: referenceLine(target.value, target.label) }),
			},
			visualContainerObjects: titles({ title, subtitle }),
			drillFilterOtherVisuals: true,
		},
	});

export interface ComboProps extends ChartProps {
	readonly category: Field;
	readonly columns: Field;
	readonly line: Field;
}

export const comboChart = ({ name, at, title, subtitle, category, columns, line, tooltips, filters }: ComboProps) =>
	defineVisual({
		name,
		position: position(at),
		...filterConfig(filters),
		visual: {
			visualType: "lineClusteredColumnComboChart",
			query: {
				queryState: {
					Category: role(project(category)),
					Y: role(project(columns)),
					Y2: role(project(line)),
					...tooltipRole(tooltips),
				},
			},
			objects: {
				dataPoint: [
					entry({ defaultColor: solid(color.dataSoft) }),
					entry({ fill: solid(color.dataSoft) }, forField(columns)),
					entry({ fill: solid(color.data) }, forField(line)),
				],
				lineStyles: obj({ strokeWidth: 3, showMarker: true, markerSize: 4, lineChartType: "linear" }),
				categoryAxis: obj({ show: true, gridlineShow: false }),
				valueAxis: obj({ show: true, gridlineShow: true, secShowAxisTitle: false }),
				legend: obj({ show: true, position: "TopRight" }),
				labels: obj({ show: false }),
			},
			visualContainerObjects: titles({ title, subtitle }),
			drillFilterOtherVisuals: true,
		},
	});

export interface ScatterProps extends ChartProps {
	readonly category: Field;
	readonly x: Field;
	readonly y: Field;
	readonly size?: Field;
	readonly quadrants?: boolean;
}

export const scatterChart = ({
	name,
	at,
	title,
	subtitle,
	category,
	x,
	y,
	size: bubble,
	quadrants = false,
	tooltips,
	filters,
}: ScatterProps) => {
	const zero = (label: string) =>
		obj(
			{
				show: true,
				displayName: label,
				value: double(0),
				lineColor: solid(color.ruleStrong),
				width: 1,
				style: "solid",
				position: "back",
				dataLabelShow: false,
			},
			{ id: "1" },
		);
	return defineVisual({
		name,
		position: position(at),
		...filterConfig(filters),
		visual: {
			visualType: "scatterChart",
			query: {
				queryState: {
					Category: role(project(category)),
					X: role(project(x)),
					Y: role(project(y)),
					...(bubble === undefined ? {} : { Size: role(project(bubble)) }),
					...tooltipRole(tooltips),
				},
			},
			objects: {
				dataPoint: obj({ defaultColor: solid(color.data) }),
				markers: obj({ transparency: 35, borderShow: false }),
				categoryLabels: obj({ show: true, color: solid(color.inkMuted), fontSize: size.pointLabel }),
				categoryAxis: obj({ show: true, gridlineShow: false, showAxisTitle: true }),
				valueAxis: obj({ show: true, gridlineShow: true, showAxisTitle: true }),
				legend: obj({ show: false }),
				...(quadrants ? { xAxisReferenceLine: zero("No change"), y1AxisReferenceLine: zero("No change") } : {}),
			},
			visualContainerObjects: titles({ title, subtitle }),
			drillFilterOtherVisuals: true,
		},
	});
};

export interface WaterfallProps extends ChartProps {
	readonly category: Field;
	readonly value: Field;
}

export const waterfallChart = ({ name, at, title, subtitle, category, value, tooltips, filters }: WaterfallProps) =>
	defineVisual({
		name,
		position: position(at),
		...filterConfig(filters),
		visual: {
			visualType: "waterfallChart",
			query: {
				queryState: {
					Category: role(project(category)),
					Y: role(project(value)),
					...tooltipRole(tooltips),
				},
				sortDefinition: sort(desc(value)),
			},
			objects: {
				sentimentColors: obj({
					increaseFill: solid(color.good),
					decreaseFill: solid(color.bad),
					totalFill: solid(color.data),
				}),
				labels: obj({ show: true, color: solid(color.ink), labelDisplayUnits: 1 }),
				categoryAxis: obj({ show: true }),
				valueAxis: obj({ show: false, gridlineShow: false }),
				legend: obj({ show: false }),
			},
			visualContainerObjects: titles({ title, subtitle }),
			drillFilterOtherVisuals: true,
		},
	});
