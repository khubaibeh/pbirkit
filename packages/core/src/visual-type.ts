import { declare } from "effect/Schema";

import type { Register } from "./register.ts";

export const BUILTIN_VISUALS = [
	"actionButton",
	"advancedSlicerVisual",
	"aiNarratives",
	"areaChart",
	"azureMap",
	"barChart",
	"bookmarkNavigator",
	"card",
	"cardVisual",
	"clusteredBarChart",
	"clusteredColumnChart",
	"columnChart",
	"decompositionTreeVisual",
	"donutChart",
	"filledMap",
	"funnel",
	"ganttChart",
	"gauge",
	"hundredPercentStackedAreaChart",
	"hundredPercentStackedBarChart",
	"hundredPercentStackedColumnChart",
	"image",
	"keyDriversVisual",
	"kpi",
	"lineChart",
	"lineClusteredColumnComboChart",
	"lineStackedColumnComboChart",
	"listSlicer",
	"map",
	"multiRowCard",
	"pageNavigator",
	"pieChart",
	"pivotTable",
	"pythonVisual",
	"qnaVisual",
	"rdlVisual",
	"ribbonChart",
	"scatterChart",
	"scorecard",
	"scriptVisual",
	"shape",
	"shapeMap",
	"slicer",
	"stackedAreaChart",
	"tableEx",
	"textSlicer",
	"textbox",
	"treemap",
	"waterfallChart",
] as const;

export type BuiltinVisual = (typeof BUILTIN_VISUALS)[number];

type CustomVisualOf<R> = R extends {
	readonly visuals: ReadonlyArray<{ readonly guid: infer G extends string }>;
}
	? G
	: never;

type ExtraVisualOf<R> = R extends { readonly builtinVisuals: ReadonlyArray<infer V extends string> }
	? V
	: never;

type ImportedVisuals<R> = R[Extract<keyof R, `import:${string}`>];

export type VisualTypeOf<R> =
	| BuiltinVisual
	| CustomVisualOf<R | ImportedVisuals<R>>
	| ExtraVisualOf<R | ImportedVisuals<R>>;

export type VisualType = VisualTypeOf<Register>;

export const VisualType = declare((input: unknown): input is VisualType => typeof input === "string", {
	expected: "a visual type",
});

export const isBuiltinVisual = (type: string): boolean => BUILTIN_VISUALS.some((builtin) => builtin === type);
