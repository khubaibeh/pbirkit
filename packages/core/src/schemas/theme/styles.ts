import {
	Array,
	Boolean,
	Finite,
	Int,
	isBetween,
	isPattern,
	Literals,
	optionalKey,
	Record,
	String,
	Struct,
	StructWithRest,
	TemplateLiteral,
	Union,
	Unknown,
} from "effect/Schema";

import { FontFace, FontSize } from "#core/font.ts";

/** A theme color as `#RRGGBB`. */
export const ThemeColor = TemplateLiteral(["#", String]).check(isPattern(/^#[0-9a-fA-F]{6}$/u));

export type ThemeColor = typeof ThemeColor.Type;

/** The names of the theme color slots. */
export const ThemeColorName = Literals([
	"foreground",
	"firstLevelElements",
	"secondLevelElements",
	"thirdLevelElements",
	"fourthLevelElements",
	"background",
	"secondaryBackground",
	"good",
	"neutral",
	"bad",
	"maximum",
	"center",
	"minimum",
	"null",
	"accent",
	"tableAccent",
	"foregroundLight",
	"foregroundDark",
	"foregroundNeutralLight",
	"foregroundNeutralDark",
	"foregroundNeutralSecondary",
	"foregroundNeutralSecondaryAlt",
	"foregroundNeutralSecondaryAlt2",
	"foregroundNeutralTertiary",
	"foregroundNeutralTertiaryAlt",
	"foregroundSelected",
	"foregroundButton",
	"backgroundLight",
	"backgroundNeutral",
	"backgroundDark",
	"hyperlink",
	"visitedHyperlink",
	"shapeStroke",
	"disabledText",
	"mapPushpin",
]);

export type ThemeColorName = typeof ThemeColorName.Type;

/** A fill color: `#RRGGBB`, `#RRGGBBAA`, or a theme color slot name. */
export const FillColor = Union([
	TemplateLiteral(["#", String]).check(isPattern(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u)),
	ThemeColorName,
]);

export type FillColor = typeof FillColor.Type;

/** A solid fill, as theme files write it: `{ solid: { color } }`. */
export const ThemeFill = Struct({ solid: Struct({ color: FillColor }) });

export type ThemeFill = typeof ThemeFill.Type;

const Transparency = Finite.check(isBetween({ minimum: 0, maximum: 100 }));

/**
 * The properties of one style object in a theme.
 * Any key that ends in `FontFamily` takes a font stack, and any key that ends in `FontSize` or `TextSize` takes a size.
 * Other keys take any value.
 */
export const VisualStyleProperties = StructWithRest(
	Struct({
		fontFamily: optionalKey(FontFace),
		fontSize: optionalKey(FontSize),
		textSize: optionalKey(FontSize),
	}),
	[
		Record(TemplateLiteral([String, "FontFamily"]), FontFace),
		Record(TemplateLiteral([String, "FontSize"]), FontSize),
		Record(TemplateLiteral([String, "TextSize"]), FontSize),
		Record(String, Unknown),
	],
);

export type VisualStyleProperties = typeof VisualStyleProperties.Type;

/**
 * The `background` style object of a visual frame.
 *
 * - `color`: The fill.
 * - `show`: When true, the background shows.
 * - `transparency`: The transparency, from 0 to 100.
 */
export const VisualBackground = Struct({
	color: optionalKey(ThemeFill),
	show: optionalKey(Boolean),
	transparency: optionalKey(Transparency),
});

export type VisualBackground = typeof VisualBackground.Type;

/**
 * The `border` style object of a visual frame.
 *
 * - `color`: The line color.
 * - `radius`: The corner radius in pixels.
 * - `show`: When true, the border shows.
 * - `width`: The line width in pixels.
 */
export const VisualBorder = Struct({
	color: optionalKey(ThemeFill),
	radius: optionalKey(Finite),
	show: optionalKey(Boolean),
	width: optionalKey(Finite),
});

export type VisualBorder = typeof VisualBorder.Type;

/**
 * The `visualHeader` style object of a visual frame.
 * `background`, `border` and `foreground` set the colors. Each `show*` key shows or hides one header button.
 */
export const VisualHeader = Struct({
	background: optionalKey(ThemeFill),
	border: optionalKey(ThemeFill),
	foreground: optionalKey(ThemeFill),
	transparency: optionalKey(Transparency),
	show: optionalKey(Boolean),
	showCommentButton: optionalKey(Boolean),
	showCopilotSummaryButton: optionalKey(Boolean),
	showCopyVisualImageButton: optionalKey(Boolean),
	showDrillDownExpandButton: optionalKey(Boolean),
	showDrillDownLevelButton: optionalKey(Boolean),
	showDrillRoleSelector: optionalKey(Boolean),
	showDrillToggleButton: optionalKey(Boolean),
	showDrillUpButton: optionalKey(Boolean),
	showFilterRestatementButton: optionalKey(Boolean),
	showFocusModeButton: optionalKey(Boolean),
	showFollowVisualButton: optionalKey(Boolean),
	showOptionsMenu: optionalKey(Boolean),
	showPersonalizeVisualButton: optionalKey(Boolean),
	showPinButton: optionalKey(Boolean),
	showSeeDataLayoutToggleButton: optionalKey(Boolean),
	showSetAlertButton: optionalKey(Boolean),
	showSmartNarrativeButton: optionalKey(Boolean),
	showTooltipButton: optionalKey(Boolean),
	showVisualErrorButton: optionalKey(Boolean),
	showVisualInformationButton: optionalKey(Boolean),
	showVisualWarningButton: optionalKey(Boolean),
});

export type VisualHeader = typeof VisualHeader.Type;

/** The tooltip fields that `VisualTooltip` and `VisualHeaderTooltip` share. */
const tooltipText = {
	background: optionalKey(ThemeFill),
	themedBackground: optionalKey(ThemeFill),
	titleFontColor: optionalKey(ThemeFill),
	themedTitleFontColor: optionalKey(ThemeFill),
	fontFamily: optionalKey(FontFace),
	fontSize: optionalKey(FontSize),
	bold: optionalKey(Boolean),
	italic: optionalKey(Boolean),
	underline: optionalKey(Boolean),
	transparency: optionalKey(Transparency),
	section: optionalKey(String),
	type: optionalKey(String),
};

/**
 * The `visualTooltip` style object of a visual frame.
 *
 * - `type`: The tooltip kind, such as `Default` or `Canvas`.
 * - `section`: The `name` of the tooltip page.
 * - `show`: When true, tooltips show.
 * - The `*Color` keys and font keys set the look.
 */
export const VisualTooltip = Struct({
	...tooltipText,
	valueFontColor: optionalKey(ThemeFill),
	themedValueFontColor: optionalKey(ThemeFill),
	actionFontColor: optionalKey(ThemeFill),
	sentenceTemplate: optionalKey(String),
	show: optionalKey(Boolean),
	showActionsInTooltips: optionalKey(Boolean),
	showChartSpecificTooltips: optionalKey(Boolean),
	showSentenceFormat: optionalKey(Boolean),
	showTooltipFieldsOnly: optionalKey(Boolean),
	showValuesInBold: optionalKey(Boolean),
});

export type VisualTooltip = typeof VisualTooltip.Type;

/**
 * The `visualHeaderTooltip` style object: the help tooltip in the visual header.
 *
 * - `text`: The help text.
 */
export const VisualHeaderTooltip = Struct({
	...tooltipText,
	text: optionalKey(String),
});

export type VisualHeaderTooltip = typeof VisualHeaderTooltip.Type;

/**
 * The `outspacePane` style object: the look of the filter pane.
 *
 * - `width`: The pane width in pixels.
 * - `transparency`: The transparency, from 0 to 100.
 */
export const FilterPane = Struct({
	backgroundColor: optionalKey(ThemeFill),
	foregroundColor: optionalKey(ThemeFill),
	borderColor: optionalKey(ThemeFill),
	inputBoxColor: optionalKey(ThemeFill),
	checkboxAndApplyColor: optionalKey(ThemeFill),
	border: optionalKey(Boolean),
	transparency: optionalKey(Transparency),
	fontFamily: optionalKey(FontFace),
	titleSize: optionalKey(FontSize),
	headerSize: optionalKey(FontSize),
	searchTextSize: optionalKey(FontSize),
	width: optionalKey(Int),
});

export type FilterPane = typeof FilterPane.Type;

/**
 * The `filterCard` style object: the look of filter cards.
 *
 * - `$id`: `Applied` styles cards with a value. `Available` styles the rest.
 */
export const FilterCard = Struct({
	$id: Literals(["Applied", "Available"]),
	backgroundColor: optionalKey(ThemeFill),
	foregroundColor: optionalKey(ThemeFill),
	borderColor: optionalKey(ThemeFill),
	inputBoxColor: optionalKey(ThemeFill),
	border: optionalKey(Boolean),
	transparency: optionalKey(Transparency),
	fontFamily: optionalKey(FontFace),
	textSize: optionalKey(FontSize),
});

export type FilterCard = typeof FilterCard.Type;

/**
 * The `background` and `outspace` style objects of a page.
 *
 * - `color`: The fill.
 * - `image`: The background image.
 * - `transparency`: The transparency, from 0 to 100.
 */
export const PageArea = Struct({
	color: optionalKey(ThemeFill),
	image: optionalKey(Unknown),
	transparency: optionalKey(Transparency),
});

export type PageArea = typeof PageArea.Type;

const StyleObjects = Record(String, Array(VisualStyleProperties));

const paneObjects = {
	outspacePane: optionalKey(Array(FilterPane)),
	filterCard: optionalKey(Array(FilterCard)),
};

/**
 * The style objects that apply to all visuals, under `visualStyles["*"]["*"]`.
 * It types the frame objects and allows any other object name.
 */
export const AllVisualStyles = StructWithRest(
	Struct({
		background: optionalKey(Array(VisualBackground)),
		border: optionalKey(Array(VisualBorder)),
		visualHeader: optionalKey(Array(VisualHeader)),
		visualTooltip: optionalKey(Array(VisualTooltip)),
		visualHeaderTooltip: optionalKey(Array(VisualHeaderTooltip)),
		...paneObjects,
	}),
	[StyleObjects],
);

export type AllVisualStyles = typeof AllVisualStyles.Type;

/** The style objects of pages, under `visualStyles.page["*"]`. */
export const PageStyles = StructWithRest(
	Struct({
		background: optionalKey(Array(PageArea)),
		outspace: optionalKey(Array(PageArea)),
		...paneObjects,
	}),
	[StyleObjects],
);

export type PageStyles = typeof PageStyles.Type;

/**
 * The `visualStyles` of a theme: visual type, then style name, then object name, then a list of property sets.
 * Use `"*"` for all visual types or all styles. `page` styles the page itself.
 */
export const VisualStyles = StructWithRest(
	Struct({
		"*": optionalKey(
			StructWithRest(Struct({ "*": optionalKey(AllVisualStyles) }), [Record(String, StyleObjects)]),
		),
		page: optionalKey(
			StructWithRest(Struct({ "*": optionalKey(PageStyles) }), [Record(String, StyleObjects)]),
		),
	}),
	[Record(String, Record(String, StyleObjects))],
);

export type VisualStyles = typeof VisualStyles.Type;
