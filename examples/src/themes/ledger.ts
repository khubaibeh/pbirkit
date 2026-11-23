import { defineTheme } from "pbirkit/schemas/theme";

import { categorical, color, font, shape, size } from "#/design.ts";
import type { Hex } from "#/design.ts";

const fill = (value: Hex) => ({ solid: { color: value } });

const panelChrome = {
	title: [
		{
			show: true,
			fontFamily: font.strong,
			fontSize: size.panelTitle,
			fontColor: fill(color.ink),
			alignment: "left",
			titleWrap: true,
		},
	],
	subTitle: [
		{ show: true, fontFamily: font.body, fontSize: size.subtitle, fontColor: fill(color.inkMuted), titleWrap: true },
	],
	divider: [{ show: false }],
	spacing: [{ customizeSpacing: true, spaceBelowTitle: 2, spaceBelowSubTitle: 10, spaceBelowTitleArea: 6 }],
	background: [{ show: true, color: fill(color.surface), transparency: 0 }],
	border: [{ show: true, color: fill(color.rule), radius: shape.radius, width: shape.hairline }],
	dropShadow: [{ show: false }],
	padding: [{ top: 16, bottom: 16, left: 20, right: 20 }],
	visualHeader: [{ show: true, foreground: fill(color.inkFaint), background: fill(color.surface), transparency: 0 }],
	visualTooltip: [
		{
			type: "Default",
			background: fill(color.surface),
			themedBackground: fill(color.surface),
			titleFontColor: fill(color.inkMuted),
			themedTitleFontColor: fill(color.inkMuted),
			valueFontColor: fill(color.ink),
			themedValueFontColor: fill(color.ink),
			actionFontColor: fill(color.data),
			fontFamily: font.body,
			fontSize: size.label,
			transparency: 0,
		},
	],
};

const chartDefaults = {
	categoryAxis: [
		{
			show: true,
			labelColor: fill(color.inkMuted),
			fontSize: size.label,
			fontFamily: font.body,
			showAxisTitle: false,
			gridlineShow: false,
			innerPadding: 28,
		},
	],
	valueAxis: [
		{
			show: true,
			labelColor: fill(color.inkFaint),
			fontSize: size.label,
			fontFamily: font.body,
			showAxisTitle: false,
			gridlineShow: true,
			gridlineColor: fill(color.rule),
			gridlineThickness: 1,
			gridlineStyle: "solid",
		},
	],
	legend: [
		{
			show: true,
			position: "TopRight",
			showTitle: false,
			labelColor: fill(color.inkMuted),
			fontSize: size.label,
			fontFamily: font.body,
		},
	],
	labels: [{ color: fill(color.ink), fontSize: size.label, fontFamily: font.body }],
	plotArea: [{ transparency: 100 }],
};

const noChrome = {
	background: [{ show: false }],
	border: [{ show: false }],
	title: [{ show: false }],
	subTitle: [{ show: false }],
	dropShadow: [{ show: false }],
	visualHeader: [{ show: false }],
	padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
};

const tableDefaults = {
	grid: [
		{
			gridVertical: false,
			gridHorizontal: true,
			gridHorizontalColor: fill(color.rule),
			gridHorizontalWeight: 1,
			rowPadding: 6,
			outlineColor: fill(color.ruleStrong),
			outlineWeight: 1,
			textSize: size.table,
		},
	],
	columnHeaders: [
		{
			fontColor: fill(color.inkMuted),
			backColor: fill(color.surface),
			fontFamily: font.strong,
			fontSize: size.label,
			wordWrap: true,
		},
	],
	values: [
		{
			fontColorPrimary: fill(color.ink),
			backColorPrimary: fill(color.surface),
			fontColorSecondary: fill(color.ink),
			backColorSecondary: fill(color.surface),
			fontFamily: font.body,
			fontSize: size.table,
		},
	],
	total: [{ fontFamily: font.strong, fontColor: fill(color.ink), backColor: fill(color.totalFill) }],
};

export const ledgerTheme = defineTheme({
	name: "Ledger",
	dataColors: [...categorical],
	foreground: color.ink,
	foregroundNeutralSecondary: color.inkMuted,
	foregroundNeutralTertiary: color.inkFaint,
	background: color.surface,
	backgroundLight: color.paper,
	backgroundNeutral: color.rule,
	tableAccent: color.data,
	good: color.good,
	neutral: color.neutral,
	bad: color.bad,
	maximum: color.data,
	center: color.dataWash,
	minimum: color.paper,
	null: color.comparison,
	hyperlink: color.data,
	visitedHyperlink: color.data,
	textClasses: {
		title: { fontFace: font.strong, fontSize: size.panelTitle, color: color.ink },
		header: { fontFace: font.strong, fontSize: size.panelTitle, color: color.ink },
		callout: { fontFace: font.figure, fontSize: size.kpiValue, color: color.ink },
		label: { fontFace: font.body, fontSize: size.table, color: color.ink },
		smallLabel: { fontFace: font.body, fontSize: size.label, color: color.inkMuted },
		largeTitle: { fontFace: font.display, fontSize: size.pageTitle, color: color.ink },
	},
	visualStyles: {
		"*": { "*": { ...panelChrome, ...chartDefaults } },
		page: {
			"*": {
				background: [{ color: fill(color.paper), transparency: 0 }],
				outspace: [{ color: fill(color.paper), transparency: 0 }],
			},
		},
		textbox: { "*": noChrome },
		shape: { "*": noChrome },
		basicShape: { "*": noChrome },
		actionButton: { "*": noChrome },
		slicer: {
			"*": {
				...noChrome,
				header: [{ show: true, fontColor: fill(color.inkMuted), fontFamily: font.body, textSize: size.label }],
				items: [
					{ fontColor: fill(color.ink), fontFamily: font.body, textSize: size.table, background: fill(color.surface) },
				],
			},
		},
		tableEx: { "*": tableDefaults },
		pivotTable: {
			"*": {
				...tableDefaults,
				rowHeaders: [
					{ fontColor: fill(color.ink), fontFamily: font.body, fontSize: size.table, backColor: fill(color.surface) },
				],
				subTotals: [{ fontFamily: font.strong }],
			},
		},
		cardVisual: {
			"*": {
				...noChrome,
				layout: [{ backgroundShow: false }],
				overflow: [{ type: 1 }],
			},
		},
	},
});
