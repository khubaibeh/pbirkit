import { at } from "./query.ts";

export interface LiteralExpression<V extends string = string> {
	readonly Literal: { readonly Value: V };
}

export const literal = <const V extends string>(Value: V): LiteralExpression<V> => ({ Literal: { Value } });

export const text = (value: string): LiteralExpression<`'${string}'`> =>
	literal(`'${value.replaceAll("'", "''")}'`);

export const textOf = (expression: unknown): string | undefined => {
	const value = at(at(expression, "Literal"), "Value");
	return typeof value === "string" && /^'.*'$/su.test(value)
		? value.slice(1, -1).replaceAll("''", "'")
		: undefined;
};

export const double = (value: number): LiteralExpression<`${number}D`> => {
	if (!Number.isFinite(value)) throw new TypeError(`[ERROR] double: ${value} is not a finite number`);
	return literal(`${value}D`);
};

export const long = (value: number | bigint): LiteralExpression<`${number | bigint}L`> => {
	if (typeof value === "number" && !Number.isSafeInteger(value))
		throw new TypeError(`[ERROR] long: ${value} is not a safe integer`);
	return literal(`${value}L`);
};

export const bool = <const V extends boolean>(value: V): LiteralExpression<`${V}`> => literal(`${value}`);

export const nil: LiteralExpression<"null"> = literal("null");
