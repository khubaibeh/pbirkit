import { at } from "./query.ts";

/** A literal value, encoded as text in `Value`. */
export interface LiteralExpression<V extends string = string> {
	readonly Literal: { readonly Value: V };
}

/**
 * Builds a literal from its encoded text, as you write it, such as `literal("0D")`.
 * Use it only when no other literal helper fits.
 */
export const literal = <const V extends string>(Value: V): LiteralExpression<V> => ({ Literal: { Value } });

/**
 * Builds a text literal, such as `'Revenue'`. It doubles any `'` inside the text.
 * Use it for text, colors and enum values.
 */
export const text = (value: string): LiteralExpression<`'${string}'`> =>
	literal(`'${value.replaceAll("'", "''")}'`);

/** Returns the text inside a text literal, or `undefined` for any other value. */
export const textOf = (expression: unknown): string | undefined => {
	const value = at(at(expression, "Literal"), "Value");
	return typeof value === "string" && /^'.*'$/su.test(value)
		? value.slice(1, -1).replaceAll("''", "'")
		: undefined;
};

/**
 * Builds a double literal, such as `12D`. It throws on a value that is not finite.
 * Use it for sizes, widths and percentages.
 */
export const double = (value: number): LiteralExpression<`${number}D`> => {
	if (!Number.isFinite(value)) throw new TypeError(`[ERROR] double: ${value} is not a finite number`);
	return literal(`${value}D`);
};

/**
 * Builds an integer literal, such as `2L`. It throws on a number that is not a safe integer.
 * Use it for integer properties such as `labelPrecision`. Desktop ignores a double there.
 */
export const long = (value: number | bigint): LiteralExpression<`${number | bigint}L`> => {
	if (typeof value === "number" && !Number.isSafeInteger(value))
		throw new TypeError(`[ERROR] long: ${value} is not a safe integer`);
	return literal(`${value}L`);
};

/** Builds a boolean literal, `true` or `false`. */
export const bool = <const V extends boolean>(value: V): LiteralExpression<`${V}`> => literal(`${value}`);

/** The `null` literal, for an empty value. */
export const nil: LiteralExpression<"null"> = literal("null");
