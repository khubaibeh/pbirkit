import type { FontFace, FontSize } from "../font.ts";
import type { Expression } from "./expression.ts";
import type { LiteralExpression } from "./literal.ts";
import { toExpression, toProperties } from "./properties.ts";
import type { Value } from "./properties.ts";

export type { Value } from "./properties.ts";

export interface ThemeColorExpression {
	readonly ThemeDataColor: { readonly ColorId: number; readonly Percent: number };
}

export const theme = (ColorId: number, Percent = 0): ThemeColorExpression => ({
	ThemeDataColor: { ColorId, Percent },
});

export type ExpressionOf<V> = V extends boolean
	? LiteralExpression<V extends true ? "true" : "false">
	: V extends number
		? LiteralExpression<`${number}D`>
		: V extends string
			? LiteralExpression<`'${string}'`>
			: V;

export function expressionOf<const V extends Value>(value: V): ExpressionOf<V>;
export function expressionOf(value: Value): unknown {
	return toExpression(value);
}

export const v = <const V extends Value>(value: V): { readonly expr: ExpressionOf<V> } => ({
	expr: expressionOf(value),
});

export type FontValue = FontFace | Expression;

export type FontKey = "fontFamily" | `${string}FontFamily`;

export type FontSizeValue = FontSize | Expression;

export type FontSizeKey = "fontSize" | "textSize" | `${string}FontSize` | `${string}TextSize`;

type Open<T> = Readonly<Record<string, unknown>> & T;

export type TextRunInput = Open<{
	readonly textStyle?: Open<{ readonly fontFamily?: FontFace; readonly fontSize?: `${FontSize}pt` }>;
}>;

export type FormattingInput = Readonly<Record<string, unknown>> & {
	readonly fontFamily?: FontValue;
	readonly [key: `${string}FontFamily`]: FontValue;
	readonly fontSize?: FontSizeValue;
	readonly textSize?: FontSizeValue;
	readonly [key: `${string}FontSize`]: FontSizeValue;
	readonly [key: `${string}TextSize`]: FontSizeValue;
	readonly paragraphs?: ReadonlyArray<Open<{ readonly textRuns?: ReadonlyArray<TextRunInput> }>>;
};

export type FormattingValue<K extends string> = K extends FontKey
	? FontValue
	: K extends FontSizeKey
		? FontSizeValue
		: unknown;

export type PropertyOf<V> = V extends Value ? { readonly expr: ExpressionOf<V> } : V;

export type Properties<P> = { readonly [K in keyof P]: PropertyOf<P[K]> };

export const style = <const P extends FormattingInput>(properties: P): P => properties;

export function props<const P extends FormattingInput>(properties: P): Properties<P>;
export function props(properties: FormattingInput): unknown {
	return toProperties(properties);
}

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

export const solid = <const C extends string | Expression>(
	color: C,
): { readonly solid: { readonly color: { readonly expr: ExpressionOf<C> } } } => ({
	solid: { color: v(color) },
});

export const scope = <const E extends Expression>(scopeId: E) => ({ scopeId });
