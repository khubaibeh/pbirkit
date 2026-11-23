/* PALETTE */
export type Hex = `#${string}`;

export const color = {
	paper: "#F4F6F6",
	surface: "#FFFFFF",
	rule: "#DFE5E6",
	ruleSoft: "#ECF0F1",
	ruleStrong: "#C9D1D3",
	totalFill: "#F4F6F6",

	ink: "#0F1A1D",
	inkMuted: "#66737A",
	inkFaint: "#8D989D",

	data: "#0E6070",
	dataSoft: "#86B0B8",
	dataWash: "#DCEBEE",
	accent: "#0E6070",
	comparison: "#A3AEB1",
	reference: "#66737A",

	good: "#2F7D3A",
	bad: "#C2362F",
	neutral: "#B7862B",
	goodWash: "#E2F0E4",
	badWash: "#F8E1DF",
} as const;

export const categorical = [
	color.data,
	"#C9822F",
	"#5E8F5A",
	"#7A5C8F",
	color.dataSoft,
	"#B8564B",
	"#5E6B7C",
	"#C7B46A",
] as const;

export const sequential = { low: "#F1F6F7", high: color.dataSoft } as const;

/* TYPOGRAPHY */
export const font = {
	display: "Segoe UI Semibold",
	body: "Segoe UI",
	strong: "Segoe UI Semibold",
	figure: "Segoe UI Light",
} as const;

export const size = {
	pageTitle: 24,
	kpiValue: 28,
	brand: 20,
	panelTitle: 13,
	body: 11,
	table: 11,
	subtitle: 11,
	nav: 11,
	label: 10,
	caption: 9,
	eyebrow: 8,
	pointLabel: 8,
} as const;

export type FontFace = (typeof font)[keyof typeof font];

export type TypeSize = (typeof size)[keyof typeof size];

/* SHAPE */
export const shape = { radius: 6, hairline: 1 } as const;
