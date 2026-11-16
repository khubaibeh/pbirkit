export interface LiteralExpression<V extends string = string> {
	readonly Literal: { readonly Value: V };
}

export const literal = <const V extends string>(Value: V): LiteralExpression<V> => ({ Literal: { Value } });

export const text = (value: string): LiteralExpression<`'${string}'`> =>
	literal(`'${value.replaceAll("'", "''")}'`);

export const double = (value: number): LiteralExpression<`${number}D`> => literal(`${value}D`);

export const long = (value: number | bigint): LiteralExpression<`${number | bigint}L`> =>
	literal(`${value}L`);

export const bool = <const V extends boolean>(value: V): LiteralExpression<`${V}`> => literal(`${value}`);

export const nil: LiteralExpression<"null"> = literal("null");
