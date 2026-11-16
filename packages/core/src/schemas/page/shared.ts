import { Array, Boolean, Literals, Number, String, Struct, optionalKey } from "effect/Schema";
import type { Constraint } from "effect/Schema";

import { formattingProperties } from "#schemas/common/formatting.ts";
import { AnyVisual } from "#schemas/visual";

export const PageDisplayOption = Literals([
	"DeprecatedDynamic",
	"FitToPage",
	"FitToWidth",
	"ActualSize",
	"ActualSizeTopLeft",
]);

export const BindingType = Literals(["Default", "Drillthrough", "Tooltip"]);

export const bindingParameterFields = <E extends Constraint>(Expression: E) => ({
	name: String,
	asAggregation: optionalKey(Boolean),
	qnaSingleSelectRequired: optionalKey(Boolean),
	fieldExpr: optionalKey(Expression),
});

export const PageBindingFields = {
	name: String,
	type: BindingType,
	referenceScope: optionalKey(Literals(["Default", "CrossReport"])),
	acceptsFilterContext: optionalKey(Literals(["Default", "None"])),
};

export const PageInformation = Struct(
	formattingProperties(
		"pageInformationName",
		"pageInformationQnaPodEnabled",
		"pageInformationAltName",
		"pageInformationType",
	),
);

export type PageInformation = typeof PageInformation.Type;

export const PageSize = Struct(formattingProperties("pageSizeTypes", "pageSizeWidth", "pageSizeHeight"));

export type PageSize = typeof PageSize.Type;

export const Background = Struct(formattingProperties("color", "image", "transparency"));

export type Background = typeof Background.Type;

export const DisplayArea = Struct(formattingProperties("verticalAlignment"));

export type DisplayArea = typeof DisplayArea.Type;

export const OutspacePane = Struct(
	formattingProperties(
		"backgroundColor",
		"transparency",
		"foregroundColor",
		"titleSize",
		"searchTextSize",
		"headerSize",
		"fontFamily",
		"border",
		"borderColor",
		"checkboxAndApplyColor",
		"inputBoxColor",
		"width",
	),
);

export type OutspacePane = typeof OutspacePane.Type;

export const FilterCard = Struct(
	formattingProperties(
		"backgroundColor",
		"transparency",
		"border",
		"borderColor",
		"foregroundColor",
		"textSize",
		"fontFamily",
		"inputBoxColor",
	),
);

export type FilterCard = typeof FilterCard.Type;

export const PageRefresh = Struct(
	formattingProperties("show", "refreshType", "duration", "dialogLauncher", "measure", "checkEvery"),
);

export type PageRefresh = typeof PageRefresh.Type;

export const PersonalizeVisual = Struct(formattingProperties("show", "perspectiveRef", "applyToAllPages"));

export type PersonalizeVisual = typeof PersonalizeVisual.Type;

export const PageFormattingProperties = {
	pageInformation: PageInformation,
	pageSize: PageSize,
	background: Background,
	displayArea: DisplayArea,
	outspace: Background,
	outspacePane: OutspacePane,
	filterCard: FilterCard,
	pageRefresh: PageRefresh,
	personalizeVisual: PersonalizeVisual,
};

export const VisualInteractionFilterType = Literals(["Default", "DataFilter", "HighlightFilter", "NoFilter"]);

export const VisualInteraction = Struct({
	source: String,
	target: String,
	type: VisualInteractionFilterType,
});

export type VisualInteraction = typeof VisualInteraction.Type;

export const QuickExploreLayout = Struct({
	version: Number,
	dataTableName: optionalKey(String),
});

export type QuickExploreLayout = typeof QuickExploreLayout.Type;

export const QuickExploreLayoutContainer = Struct({
	related: optionalKey(QuickExploreLayout),
	combination: optionalKey(QuickExploreLayout),
});

export type QuickExploreLayoutContainer = typeof QuickExploreLayoutContainer.Type;

export const autoPageGenerationConfig = <E extends Constraint>(Expression: E) =>
	Struct({
		selectedFields: Array(Expression),
		visualContainerConfigurations: Array(Struct({ name: String, fields: Array(Expression) })),
		layout: optionalKey(QuickExploreLayoutContainer),
	});

export const Annotation = Struct({
	name: String,
	value: String,
});

export type Annotation = typeof Annotation.Type;

export const PageFields = {
	name: String,
	displayName: String,
	displayOption: PageDisplayOption,
	height: optionalKey(Number),
	width: optionalKey(Number),
	visibility: optionalKey(Literals(["AlwaysVisible", "HiddenInViewMode"])),
	visualInteractions: optionalKey(Array(VisualInteraction)),
	annotations: optionalKey(Array(Annotation)),
	howCreated: optionalKey(Literals(["Default", "Copilot"])),
};

export const PageVisuals = Array(AnyVisual);
