import { Array, Literals, Number, Record, String, Struct, Union, Unknown, optionalKey } from "effect/Schema";

export const ThemeColor = String;

export const BaseThemeName = Literals([
	"CY17SU10",
	"CY17SU12",
	"CY18SU04",
	"CY18SU07",
	"CY19SU06",
	"CY19SU12",
	"CY20SU07",
	"CY20SU09",
	"CY21SU02",
	"CY21SU03",
	"CY21SU04",
	"CY21SU07",
	"CY21SU11",
	"CY22SU03",
	"CY22SU08",
	"CY22SU09",
	"CY22SU11",
	"CY23SU04",
	"CY23SU08",
	"CY23SU11",
	"CY24SU02",
	"CY24SU05",
	"CY24SU06",
	"CY24SU08",
	"CY24SU10",
	"CY25SU10",
	"CY25SU11",
	"CY25SU12",
	"CY26SU02",
	"Fluent2-CY26SU03",
	"CY26SU04",
	"Fluent2-CY26SU04",
	"CY26SU05",
	"Fluent2-CY26SU05",
	"CY26SU07",
	"Fluent2-CY26SU07",
	"CY26SU08",
	"Fluent2-CY26SU08",
	"CY26SU09",
	"Fluent2-CY26SU09",
	"CY26SU10",
	"Fluent2-CY26SU10",
]);

export const TextClass = Struct({
	fontFace: optionalKey(String),
	fontSize: optionalKey(Number),
	fontWeight: optionalKey(String),
	color: optionalKey(ThemeColor),
});

export type TextClass = typeof TextClass.Type;

export const TextClasses = Struct({
	title: optionalKey(TextClass),
	label: optionalKey(TextClass),
	callout: optionalKey(TextClass),
	header: optionalKey(TextClass),
	largeTitle: optionalKey(TextClass),
	dataTitle: optionalKey(TextClass),
	boldLabel: optionalKey(TextClass),
	largeLabel: optionalKey(TextClass),
	largeLightLabel: optionalKey(TextClass),
	lightLabel: optionalKey(TextClass),
	semiboldLabel: optionalKey(TextClass),
	smallLabel: optionalKey(TextClass),
	smallLightLabel: optionalKey(TextClass),
	smallDataLabel: optionalKey(TextClass),
});

export const ThemeIcon = Struct({ url: String, description: optionalKey(String) });

export const VisualStyles = Record(String, Record(String, Record(String, Array(Record(String, Unknown)))));

export type VisualStyles = typeof VisualStyles.Type;

export const Theme = Struct({
	$schema: optionalKey(String),
	name: String,
	baseTheme: optionalKey(BaseThemeName),
	visualStyles: optionalKey(VisualStyles),
	dataColors: optionalKey(Array(ThemeColor)),
	icons: optionalKey(Union([Record(String, ThemeIcon), Array(ThemeIcon)])),
	textClasses: optionalKey(TextClasses),
	foreground: optionalKey(ThemeColor),
	firstLevelElements: optionalKey(ThemeColor),
	secondLevelElements: optionalKey(ThemeColor),
	thirdLevelElements: optionalKey(ThemeColor),
	fourthLevelElements: optionalKey(ThemeColor),
	background: optionalKey(ThemeColor),
	secondaryBackground: optionalKey(ThemeColor),
	good: optionalKey(ThemeColor),
	neutral: optionalKey(ThemeColor),
	bad: optionalKey(ThemeColor),
	maximum: optionalKey(ThemeColor),
	center: optionalKey(ThemeColor),
	minimum: optionalKey(ThemeColor),
	null: optionalKey(ThemeColor),
	accent: optionalKey(ThemeColor),
	tableAccent: optionalKey(ThemeColor),
	foregroundLight: optionalKey(ThemeColor),
	foregroundDark: optionalKey(ThemeColor),
	foregroundNeutralLight: optionalKey(ThemeColor),
	foregroundNeutralDark: optionalKey(ThemeColor),
	foregroundNeutralSecondary: optionalKey(ThemeColor),
	foregroundNeutralSecondaryAlt: optionalKey(ThemeColor),
	foregroundNeutralSecondaryAlt2: optionalKey(ThemeColor),
	foregroundNeutralTertiary: optionalKey(ThemeColor),
	foregroundNeutralTertiaryAlt: optionalKey(ThemeColor),
	foregroundSelected: optionalKey(ThemeColor),
	foregroundButton: optionalKey(ThemeColor),
	backgroundLight: optionalKey(ThemeColor),
	backgroundNeutral: optionalKey(ThemeColor),
	backgroundDark: optionalKey(ThemeColor),
	hyperlink: optionalKey(ThemeColor),
	visitedHyperlink: optionalKey(ThemeColor),
	shapeStroke: optionalKey(ThemeColor),
	disabledText: optionalKey(ThemeColor),
	mapPushpin: optionalKey(ThemeColor),
});

export type Theme = typeof Theme.Type;

export const defineTheme = (theme: Theme): Theme => theme;
