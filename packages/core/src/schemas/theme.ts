import {
	Array,
	Finite,
	Record,
	String,
	Struct,
	StructWithRest,
	TemplateLiteral,
	Union,
	Unknown,
	decodeUnknownSync,
	is,
	optionalKey,
} from "effect/Schema";
import type { Constraint } from "effect/Schema";

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

const colorSlots = <C extends Constraint>(Color: C) => ({
	foreground: optionalKey(Color),
	firstLevelElements: optionalKey(Color),
	secondLevelElements: optionalKey(Color),
	thirdLevelElements: optionalKey(Color),
	fourthLevelElements: optionalKey(Color),
	background: optionalKey(Color),
	secondaryBackground: optionalKey(Color),
	good: optionalKey(Color),
	neutral: optionalKey(Color),
	bad: optionalKey(Color),
	maximum: optionalKey(Color),
	center: optionalKey(Color),
	minimum: optionalKey(Color),
	null: optionalKey(Color),
	accent: optionalKey(Color),
	tableAccent: optionalKey(Color),
	foregroundLight: optionalKey(Color),
	foregroundDark: optionalKey(Color),
	foregroundNeutralLight: optionalKey(Color),
	foregroundNeutralDark: optionalKey(Color),
	foregroundNeutralSecondary: optionalKey(Color),
	foregroundNeutralSecondaryAlt: optionalKey(Color),
	foregroundNeutralSecondaryAlt2: optionalKey(Color),
	foregroundNeutralTertiary: optionalKey(Color),
	foregroundNeutralTertiaryAlt: optionalKey(Color),
	foregroundSelected: optionalKey(Color),
	foregroundButton: optionalKey(Color),
	backgroundLight: optionalKey(Color),
	backgroundNeutral: optionalKey(Color),
	backgroundDark: optionalKey(Color),
	hyperlink: optionalKey(Color),
	visitedHyperlink: optionalKey(Color),
	shapeStroke: optionalKey(Color),
	disabledText: optionalKey(Color),
	mapPushpin: optionalKey(Color),
});

export const Theme = Struct({
	$schema: optionalKey(String),
	name: String,
	baseTheme: optionalKey(String),
	visualStyles: optionalKey(VisualStyles),
	dataColors: optionalKey(Array(ThemeColor)),
	icons: optionalKey(Union([Record(String, ThemeIcon), Array(ThemeIcon)])),
	textClasses: optionalKey(TextClasses),
	...colorSlots(ThemeColor),
});

export type Theme = typeof Theme.Type;

export const defineTheme = (theme: Theme): Theme => theme;

export const decodeTheme = (json: unknown): Theme =>
	decodeUnknownSync(Theme)(json, { onExcessProperty: "error" });

const Open = Record(String, Unknown);

const DesktopColor = TemplateLiteral(["#", String]);

export const DesktopTextClass = StructWithRest(
	Struct({
		fontFace: optionalKey(String),
		fontSize: optionalKey(Finite),
		fontWeight: optionalKey(String),
		color: optionalKey(DesktopColor),
	}),
	[Open],
);

export type DesktopTextClass = typeof DesktopTextClass.Type;

export const DesktopTheme = StructWithRest(
	Struct({
		$schema: optionalKey(String),
		name: String,
		visualStyles: optionalKey(Record(String, Record(String, Record(String, Array(Open))))),
		dataColors: optionalKey(Array(DesktopColor)),
		textClasses: optionalKey(Record(String, DesktopTextClass)),
		...colorSlots(DesktopColor),
	}),
	[Open],
);

export type DesktopTheme = typeof DesktopTheme.Type;

export const defineDesktopTheme = <const T extends DesktopTheme>(theme: T): T => theme;

export const decodeDesktopTheme = (json: unknown): DesktopTheme => {
	const theme = decodeUnknownSync(DesktopTheme)(json);
	return is(DesktopTheme)(json) ? json : theme;
};
