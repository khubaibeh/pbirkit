import {
	Array,
	Boolean,
	Int,
	Literals,
	Number,
	Record,
	String,
	Struct,
	StructWithRest,
	TemplateLiteral,
	Unknown,
	isBetween,
	isPattern,
	optionalKey,
} from "effect/Schema";

import { FontFace, FontSize } from "#core/font.ts";

export const ThemeColor = TemplateLiteral(["#", String]).check(isPattern(/^#[0-9a-fA-F]{6}$/u));

export type ThemeColor = typeof ThemeColor.Type;

export const ThemeFill = Struct({ solid: Struct({ color: ThemeColor }) });

export type ThemeFill = typeof ThemeFill.Type;

const Transparency = Number.check(isBetween({ minimum: 0, maximum: 100 }));

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

export const VisualBackground = Struct({
	color: optionalKey(ThemeFill),
	show: optionalKey(Boolean),
	transparency: optionalKey(Transparency),
});

export type VisualBackground = typeof VisualBackground.Type;

export const VisualBorder = Struct({
	color: optionalKey(ThemeFill),
	radius: optionalKey(Number),
	show: optionalKey(Boolean),
	width: optionalKey(Number),
});

export type VisualBorder = typeof VisualBorder.Type;

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

export const VisualHeaderTooltip = Struct({
	...tooltipText,
	text: optionalKey(String),
});

export type VisualHeaderTooltip = typeof VisualHeaderTooltip.Type;

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

export const PageStyles = StructWithRest(
	Struct({
		background: optionalKey(Array(PageArea)),
		outspace: optionalKey(Array(PageArea)),
		...paneObjects,
	}),
	[StyleObjects],
);

export type PageStyles = typeof PageStyles.Type;

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
