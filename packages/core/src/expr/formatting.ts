import { isExpression } from "./expression.ts";
import type { Expression } from "./expression.ts";
import { bool, double, text } from "./literal.ts";
import type { LiteralExpression } from "./literal.ts";

export interface ThemeColorExpression {
	readonly ThemeDataColor: { readonly ColorId: number; readonly Percent: number };
}

export const theme = (ColorId: number, Percent = 0): ThemeColorExpression => ({
	ThemeDataColor: { ColorId, Percent },
});

export type Value = boolean | number | string | Expression;

export type ExpressionOf<V> = V extends boolean
	? LiteralExpression<V extends true ? "true" : "false">
	: V extends number
		? LiteralExpression<`${number}D`>
		: V extends string
			? LiteralExpression<`'${string}'`>
			: V;

export function expressionOf<const V extends Value>(value: V): ExpressionOf<V>;
export function expressionOf(value: Value): unknown {
	if (typeof value === "boolean") return bool(value);
	if (typeof value === "number") return double(value);
	if (typeof value === "string") return text(value);
	return value;
}

export const v = <const V extends Value>(value: V): { readonly expr: ExpressionOf<V> } => ({
	expr: expressionOf(value),
});

export type PropertyOf<V> = V extends Value ? { readonly expr: ExpressionOf<V> } : V;

export type Properties<P> = { readonly [K in keyof P]: PropertyOf<P[K]> };

const isValue = (value: unknown): value is Value =>
	typeof value === "boolean" || typeof value === "number" || typeof value === "string" || isExpression(value);

export function props<const P extends Readonly<Record<string, unknown>>>(properties: P): Properties<P>;
export function props(properties: Readonly<Record<string, unknown>>): unknown {
	return Object.fromEntries(
		Object.entries(properties).map(([key, value]) => [key, isValue(value) ? v(value) : value]),
	);
}

export function entry<const P extends Readonly<Record<string, unknown>>>(
	properties: P,
): { readonly properties: Properties<P> };
export function entry<const P extends Readonly<Record<string, unknown>>, const S>(
	properties: P,
	selector: S,
): { readonly properties: Properties<P>; readonly selector: S };
export function entry(properties: Readonly<Record<string, unknown>>, selector?: unknown): unknown {
	return selector === undefined
		? { properties: props(properties) }
		: { properties: props(properties), selector };
}

export function obj<const P extends Readonly<Record<string, unknown>>>(
	properties: P,
): readonly [{ readonly properties: Properties<P> }];
export function obj<const P extends Readonly<Record<string, unknown>>, const S>(
	properties: P,
	selector: S,
): readonly [{ readonly properties: Properties<P>; readonly selector: S }];
export function obj(properties: Readonly<Record<string, unknown>>, selector?: unknown): unknown {
	return [selector === undefined ? entry(properties) : entry(properties, selector)];
}

export const solid = <const C extends string | Expression>(
	color: C,
): { readonly solid: { readonly color: { readonly expr: ExpressionOf<C> } } } => ({
	solid: { color: v(color) },
});

export const scope = <const E extends Expression>(scopeId: E) => ({ scopeId });
