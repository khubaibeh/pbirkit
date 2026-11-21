import { Array, Record, String, Struct, Union, decodeUnknownSync, optionalKey } from "effect/Schema";

import { FontFace, FontSize } from "#core/font.ts";

import { ThemeColor, VisualStyles } from "./theme/styles.ts";

export * from "./theme/styles.ts";

export const TextClass = Struct({
	fontFace: optionalKey(FontFace),
	fontSize: optionalKey(FontSize),
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

export type TextClasses = typeof TextClasses.Type;

export const ThemeIcon = Struct({ url: String, description: optionalKey(String) });

export type ThemeIcon = typeof ThemeIcon.Type;

export const Theme = Struct({
	$schema: optionalKey(String),
	name: String,
	baseTheme: optionalKey(String),
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

export const decodeTheme = (json: unknown): Theme =>
	decodeUnknownSync(Theme)(json, { onExcessProperty: "error" });
