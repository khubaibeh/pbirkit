import { Array, Boolean, Finite, Literals, optionalKey, String, Struct, Union } from "effect/Schema";
import type { Constraint } from "effect/Schema";

import { formattingProperties } from "#schemas/common/formatting.ts";
import { RawItem } from "#schemas/common/raw.ts";
import { AnyVisual } from "#schemas/visual";

/**
 * How the page scales.
 * `FitToPage` fits width and height to the view. `FitToWidth` fits the width and keeps the aspect ratio.
 * `ActualSize` centers the page with no scaling. `DeprecatedDynamic` and `ActualSizeTopLeft` are old forms.
 */
export const PageDisplayOption = Literals([
	"DeprecatedDynamic",
	"FitToPage",
	"FitToWidth",
	"ActualSize",
	"ActualSizeTopLeft",
]);

export type PageDisplayOption = typeof PageDisplayOption.Type;

/** What a page binding does. `Default` has no special use. */
export const BindingType = Literals(["Default", "Drillthrough", "Tooltip"]);

export type BindingType = typeof BindingType.Type;

/**
 * The fields of a binding parameter that all versions share.
 * A parameter is a field that a drillthrough or tooltip page takes as a filter.
 *
 * - `name`: The parameter name. It must be unique in the report.
 * - `asAggregation`: When true, the parameter applies when the field is aggregated.
 * - `qnaSingleSelectRequired`: When true, the filter must pick exactly one value.
 * - `fieldExpr`: The field that the parameter filters on.
 */
export const bindingParameterFields = <E extends Constraint>(Expression: E) => ({
	name: String,
	asAggregation: optionalKey(Boolean),
	qnaSingleSelectRequired: optionalKey(Boolean),
	fieldExpr: optionalKey(Expression),
});

/**
 * The fields of a page binding that all versions share.
 * A binding makes the page a drillthrough or tooltip target.
 *
 * - `name`: The binding name. It must be unique in the report.
 * - `type`: The use of the binding: drillthrough, tooltip, or none.
 * - `referenceScope`: `CrossReport` allows drillthrough from other reports. `Default` keeps it in this
 *   report.
 * - `acceptsFilterContext`: `None` stops other filters from flowing into the page when the binding runs.
 */
export const PageBindingFields = {
	name: String,
	type: BindingType,
	referenceScope: optionalKey(Literals(["Default", "CrossReport"])),
	acceptsFilterContext: optionalKey(Literals(["Default", "None"])),
};

/** The `pageInformation` formatting object: name, alt name, type and Q&A settings. */
export const PageInformation = Struct(
	formattingProperties(
		"pageInformationName",
		"pageInformationQnaPodEnabled",
		"pageInformationAltName",
		"pageInformationType",
	),
);

export type PageInformation = typeof PageInformation.Type;

/** The `pageSize` formatting object: the size type, width and height. */
export const PageSize = Struct(formattingProperties("pageSizeTypes", "pageSizeWidth", "pageSizeHeight"));

export type PageSize = typeof PageSize.Type;

/** A `background` or `outspace` formatting object: color, image and transparency. */
export const Background = Struct(formattingProperties("color", "image", "transparency"));

export type Background = typeof Background.Type;

/** The `displayArea` formatting object: how the page sits in the view. */
export const DisplayArea = Struct(formattingProperties("verticalAlignment"));

export type DisplayArea = typeof DisplayArea.Type;

/** The `outspacePane` formatting object: the look of the filter pane. */
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

/** The `filterCard` formatting object: the look of the filter cards in the filter pane. */
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

/** The `pageRefresh` formatting object: automatic page refresh for DirectQuery. */
export const PageRefresh = Struct(
	formattingProperties("show", "refreshType", "duration", "dialogLauncher", "measure", "checkEvery"),
);

export type PageRefresh = typeof PageRefresh.Type;

/** The `personalizeVisual` formatting object: whether viewers can personalize visuals. */
export const PersonalizeVisual = Struct(formattingProperties("show", "perspectiveRef", "applyToAllPages"));

export type PersonalizeVisual = typeof PersonalizeVisual.Type;

/** The formatting objects that `page.json` takes in `objects`. */
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

/**
 * How a selection flows to a target visual.
 * `Default` lets the target pick. `DataFilter` filters, `HighlightFilter` highlights, and `NoFilter` ignores it.
 */
export const VisualInteractionFilterType = Literals(["Default", "DataFilter", "HighlightFilter", "NoFilter"]);

export type VisualInteractionFilterType = typeof VisualInteractionFilterType.Type;

/**
 * How a selection in one visual affects another visual on the page.
 *
 * - `source`: The `name` of the visual where the user selects.
 * - `target`: The `name` of the visual that reacts.
 * - `type`: How the selection flows to the target.
 */
export const VisualInteraction = Struct({
	source: String,
	target: String,
	type: VisualInteractionFilterType,
});

export type VisualInteraction = typeof VisualInteraction.Type;

/**
 * A layout from auto page generation.
 *
 * - `dataTableName`: The `name` of the data table visual, if the layout shows one.
 */
export const QuickExploreLayout = Struct({
	version: Finite,
	dataTableName: optionalKey(String),
});

export type QuickExploreLayout = typeof QuickExploreLayout.Type;

/**
 * The layout that auto page generation picked.
 *
 * - `related`: One main visual with related visuals.
 * - `combination`: Visuals from field combinations. It is an old form, so use `related`.
 */
export const QuickExploreLayoutContainer = Struct({
	related: optionalKey(QuickExploreLayout),
	combination: optionalKey(QuickExploreLayout),
});

export type QuickExploreLayoutContainer = typeof QuickExploreLayoutContainer.Type;

/**
 * Builds the schema of the settings that made a page automatically, such as through Auto create.
 * Desktop writes it. You rarely set it by hand.
 *
 * - `selectedFields`: The fields that the generation used.
 * - `visualContainerConfigurations`: The generated visuals, by visual `name`, with the fields of each.
 * - `layout`: The layout that the generation picked.
 */
export const autoPageGenerationConfig = <E extends Constraint>(Expression: E) =>
	Struct({
		selectedFields: Array(Expression),
		visualContainerConfigurations: Array(Struct({ name: String, fields: Array(Expression) })),
		layout: optionalKey(QuickExploreLayoutContainer),
	});

/** A name and value pair that the page keeps, such as notes for other tools. */
export const Annotation = Struct({
	name: String,
	value: String,
});

export type Annotation = typeof Annotation.Type;

/**
 * The `page.json` fields that all versions share.
 *
 * - `name`: The page id. It must be unique in the report, and it names the page folder.
 * - `displayName`: The page name that the page tabs show.
 * - `displayOption`: How the page scales in the view.
 * - `height`: The page height in pixels. Only `DeprecatedDynamic` may leave it out.
 * - `width`: The page width in pixels. Only `DeprecatedDynamic` may leave it out.
 * - `visibility`: `HiddenInViewMode` hides the page tab in view mode. The default is `AlwaysVisible`.
 * - `visualInteractions`: Overrides of how selections flow between visuals. Without one, the target visual
 *   picks.
 * - `annotations`: Extra name and value pairs to keep with the page.
 * - `howCreated`: `Copilot` marks a page that Copilot made. The default is `Default`.
 */
export const PageFields = {
	name: String,
	displayName: String,
	displayOption: PageDisplayOption,
	height: optionalKey(Finite),
	width: optionalKey(Finite),
	visibility: optionalKey(Literals(["AlwaysVisible", "HiddenInViewMode"])),
	visualInteractions: optionalKey(Array(VisualInteraction)),
	annotations: optionalKey(Array(Annotation)),
	howCreated: optionalKey(Literals(["Default", "Copilot"])),
};

/** The visuals of a page in config input. Each is a full visual, or a `RawItem` that copies a `visual.json`. */
export const PageVisuals = Array(Union([AnyVisual, RawItem]));

export type PageVisuals = typeof PageVisuals.Type;
