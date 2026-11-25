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

/**
 * The font settings of one text class.
 *
 * - `fontFace`: The font stack, from `pbirkit/font`.
 * - `fontSize`: The size in points, from the scale in `pbirkit/font`.
 * - `fontWeight`: The font weight, such as `"bold"`.
 * - `color`: The text color, as `#RRGGBB`.
 */
export const TextClass = Struct({
	fontFace: optionalKey(FontFace),
	fontSize: optionalKey(FontSize),
	fontWeight: optionalKey(String),
	color: optionalKey(ThemeColor),
});

export type TextClass = typeof TextClass.Type;

/**
 * The text classes of a theme. Visuals pick a class for each kind of text.
 * `title`, `label`, `callout` and `header` are the main ones. The others derive from them unless set.
 */
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

/**
 * An icon that a theme adds, such as for a button or a conditional format.
 *
 * - `url`: The image, often a data URL.
 * - `description`: The name that the icon picker shows.
 */
export const ThemeIcon = Struct({ url: String, description: optionalKey(String) });

export type ThemeIcon = typeof ThemeIcon.Type;

/**
 * The named color slots of a theme. Visuals and formatting refer to them by name.
 *
 * - `foreground`, `firstLevelElements`: Main text, such as titles, labels and values.
 * - `secondLevelElements`: Secondary text, such as axis titles and legend text.
 * - `thirdLevelElements`: Gridlines and axis lines.
 * - `fourthLevelElements`: Dim text and marks.
 * - `background`: Visual and page backgrounds.
 * - `secondaryBackground`: Lighter fills, such as slicer and button states.
 * - `tableAccent`: The accent of table and matrix grids.
 * - `good`, `neutral`, `bad`: KPI and waterfall colors.
 * - `maximum`, `center`, `minimum`, `null`: The default diverging color scale.
 * - `hyperlink`, `visitedHyperlink`: Link colors.
 * - The `foreground*` and `background*` variants: Shades that Desktop derives unless set.
 */
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

/**
 * A custom theme that pbirkit checks. Pass it to `customTheme` in `pbirkit/resource`.
 * Colors are `#RRGGBB`. Fonts and sizes come from `pbirkit/font`.
 *
 * - `name`: The theme name that Desktop shows.
 * - `baseTheme`: The name of the base theme under this one.
 * - `visualStyles`: Default formatting per visual type, style and object.
 * - `dataColors`: The series colors, in order. `ThemeDataColor` picks one by index.
 * - `icons`: Extra icons, by name or as a list.
 * - `textClasses`: The fonts of each text class.
 * - Each color slot sets one named color. See `colorSlots`.
 */
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

/** Returns a custom theme as it is, with its type checked. */
export const defineTheme = (theme: Theme): Theme => theme;

/** Decodes JSON as a `Theme`. It fails on unknown keys. */
export const decodeTheme = (json: unknown): Theme =>
	decodeUnknownSync(Theme)(json, { onExcessProperty: "error" });

const Open = Record(String, Unknown);

const DesktopColor = TemplateLiteral(["#", String]);

/** A text class from a Desktop theme file. It allows any extra keys. */
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

/**
 * A theme as Desktop writes it, such as a base theme. Its checks are loose, and it keeps unknown keys.
 * Pass it to `baseTheme` or `builtInTheme` in `pbirkit/resource`.
 */
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

/** Returns a Desktop theme as it is, with its literal type kept. */
export const defineDesktopTheme = <const T extends DesktopTheme>(theme: T): T => theme;

/** Decodes JSON as a `DesktopTheme`. It returns the input itself when it is already valid, so key order stays the same. */
export const decodeDesktopTheme = (json: unknown): DesktopTheme => {
	const theme = decodeUnknownSync(DesktopTheme)(json);
	return is(DesktopTheme)(json) ? json : theme;
};
