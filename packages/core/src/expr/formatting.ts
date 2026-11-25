import type { FontFace, FontSize } from "../font.ts";
import type { Expression } from "./expression.ts";
import type { LiteralExpression } from "./literal.ts";
import { toExpression, toProperties } from "./properties.ts";
import type { Value } from "./properties.ts";

export type { Value } from "./properties.ts";

/** A theme color, by index into `dataColors`, with a shade. `theme` builds it. */
export interface ThemeColorExpression {
	readonly ThemeDataColor: { readonly ColorId: number; readonly Percent: number };
}

/**
 * Builds a theme color, such as `theme(1, 0.4)`.
 * `ColorId` is the index into `dataColors`. `Percent` runs from `-1` darker to `1` lighter, and `0` keeps the color.
 */
export const theme = (ColorId: number, Percent = 0): ThemeColorExpression => ({
	ThemeDataColor: { ColorId, Percent },
});

/** The literal type that `expressionOf` makes from a plain value. */
export type ExpressionOf<V> = V extends boolean
	? LiteralExpression<V extends true ? "true" : "false">
	: V extends number
		? LiteralExpression<`${number}D`>
		: V extends string
			? LiteralExpression<`'${string}'`>
			: V;

/**
 * Turns a plain value into an expression: a boolean, a double or a text literal.
 * It returns an expression as it is.
 */
export function expressionOf<const V extends Value>(value: V): ExpressionOf<V>;
export function expressionOf(value: Value): unknown {
	return toExpression(value);
}

/** Wraps one value as `{ expr }`, for a spot outside `obj` that needs it. */
export const v = <const V extends Value>(value: V): { readonly expr: ExpressionOf<V> } => ({
	expr: expressionOf(value),
});

/** A font key value: a font stack from `pbirkit/font`, or an expression. */
export type FontValue = FontFace | Expression;

/** A formatting key that takes a font: `fontFamily`, or a key that ends in `FontFamily`. */
export type FontKey = "fontFamily" | `${string}FontFamily`;

/** A size key value: a size from the scale in `pbirkit/font`, or an expression. */
export type FontSizeValue = FontSize | Expression;

/** A formatting key that takes a size: `fontSize`, `textSize`, or a key that ends in `FontSize` or `TextSize`. */
export type FontSizeKey = "fontSize" | "textSize" | `${string}FontSize` | `${string}TextSize`;

type Open<T> = Readonly<Record<string, unknown>> & T;

/** A text run in `paragraphs`, with its font checked. */
export type TextRunInput = Open<{
	readonly textStyle?: Open<{ readonly fontFamily?: FontFace; readonly fontSize?: `${FontSize}pt` }>;
}>;

/**
 * The plain input of `obj`, `entry`, `props` and `style`: format settings by name.
 * Font and size keys take only valid fonts and sizes. Other keys take any value.
 */
export type FormattingInput = Readonly<Record<string, unknown>> & {
	readonly fontFamily?: FontValue;
	readonly [key: `${string}FontFamily`]: FontValue;
	readonly fontSize?: FontSizeValue;
	readonly textSize?: FontSizeValue;
	readonly [key: `${string}FontSize`]: FontSizeValue;
	readonly [key: `${string}TextSize`]: FontSizeValue;
	readonly paragraphs?: ReadonlyArray<Open<{ readonly textRuns?: ReadonlyArray<TextRunInput> }>>;
};

/** The value type of one formatting key: a font, a size, or anything. */
export type FormattingValue<K extends string> = K extends FontKey
	? FontValue
	: K extends FontSizeKey
		? FontSizeValue
		: unknown;

/** The property type that `props` makes from one value: `{ expr }` for a plain value, else the value itself. */
export type PropertyOf<V> = V extends Value ? { readonly expr: ExpressionOf<V> } : V;

/** The properties record that `props` makes. */
export type Properties<P> = { readonly [K in keyof P]: PropertyOf<P[K]> };

/** Returns a record of format settings as it is, with its type checked. Keep it to reuse with `obj` or `entry`. */
export const style = <const P extends FormattingInput>(properties: P): P => properties;

/** Builds the `properties` record of one entry. A plain value becomes `{ expr }`, and any other value stays as it is. */
export function props<const P extends FormattingInput>(properties: P): Properties<P>;
export function props(properties: FormattingInput): unknown {
	return toProperties(properties);
}

/**
 * Builds one entry of a formatting object: its properties and an optional selector.
 * Use it for an object with several entries.
 */
export function entry<const P extends FormattingInput>(properties: P): { readonly properties: Properties<P> };
export function entry<const P extends FormattingInput, const S>(
	properties: P,
	selector: S,
): { readonly properties: Properties<P>; readonly selector: S };
export function entry(properties: FormattingInput, selector?: unknown): unknown {
	return selector === undefined
		? { properties: props(properties) }
		: { properties: props(properties), selector };
}

/**
 * Builds a formatting object with one entry, such as `title: obj({ show: true, text: "Revenue" })`.
 * Pass a selector as the second value to scope it.
 */
export function obj<const P extends FormattingInput>(
	properties: P,
): readonly [{ readonly properties: Properties<P> }];
export function obj<const P extends FormattingInput, const S>(
	properties: P,
	selector: S,
): readonly [{ readonly properties: Properties<P>; readonly selector: S }];
export function obj(properties: FormattingInput, selector?: unknown): unknown {
	return [selector === undefined ? entry(properties) : entry(properties, selector)];
}

/**
 * Builds a solid color, such as `solid("#1F6FEB")` or `solid(theme(1, 0.4))`.
 * A conditional color from `when` also goes inside it.
 */
export const solid = <const C extends string | Expression>(
	color: C,
): { readonly solid: { readonly color: { readonly expr: ExpressionOf<C> } } } => ({
	solid: { color: v(color) },
});

/** Builds a data selector entry that matches the data points where the condition is true. */
export const scope = <const E extends Expression>(scopeId: E) => ({ scopeId });
