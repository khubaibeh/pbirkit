import { isIn, not } from "./condition.ts";
import type { Expression } from "./expression.ts";
import type { AliasRef, EntityRef } from "./field.ts";
import { expressionOf } from "./formatting.ts";
import type { ExpressionOf, Value } from "./formatting.ts";
import { at, entityOf } from "./query.ts";

export const from = <const N extends string, const E extends string>(Name: N, Entity: E) => ({
	Name,
	Entity,
	Type: 0 as const,
});

export type EntitySource = ReturnType<typeof from>;

export type Where<C extends ReadonlyArray<Expression>> = {
	readonly [I in keyof C]: { readonly Condition: C[I] };
};

export interface FilterDefinition<F extends ReadonlyArray<EntitySource>, W> {
	readonly Version: 2;
	readonly From: F;
	readonly Where: W;
}

export function filterDef<
	const F extends ReadonlyArray<EntitySource>,
	const C extends ReadonlyArray<Expression>,
>(From: F, ...conditions: C): FilterDefinition<F, Where<C>>;
export function filterDef(
	From: ReadonlyArray<EntitySource>,
	...conditions: ReadonlyArray<Expression>
): unknown {
	return { Version: 2, From, Where: conditions.map((Condition) => ({ Condition })) };
}

export type Aliased<T> = T extends EntityRef
	? AliasRef
	: T extends object
		? { readonly [K in keyof T]: Aliased<T[K]> }
		: T;

const entityIn = (value: unknown): string | undefined => {
	const own = entityOf(value);
	if (own !== undefined) return own;
	if (typeof value !== "object" || value === null) return undefined;
	for (const key of Object.keys(value)) {
		const found = entityIn(at(value, key));
		if (found !== undefined) return found;
	}
	return undefined;
};

const replaceEntity = (value: unknown, entity: string, source: string): unknown => {
	if (entityOf(value) === entity) return { SourceRef: { Source: source } };
	if (globalThis.Array.isArray(value)) return value.map((item) => replaceEntity(item, entity, source));
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [key, replaceEntity(item, entity, source)]),
	);
};

export const defaultAlias = (entity: string): string => entity.charAt(0).toLowerCase();

export function aliased<const F extends Expression>(field: F, source: string): Aliased<F>;
export function aliased(field: Expression, source: string): unknown {
	const entity = entityIn(field);
	if (entity === undefined) throw new Error(`[ERROR] aliased: no entity in ${JSON.stringify(field)}`);
	return replaceEntity(field, entity, source);
}

export function filterOn<const F extends Expression, const C extends Expression>(
	field: F,
	condition: (field: Aliased<F>) => C,
	alias?: string,
): FilterDefinition<readonly [EntitySource], readonly [{ readonly Condition: C }]>;
export function filterOn(
	field: Expression,
	condition: (field: unknown) => Expression,
	alias?: string,
): unknown {
	const entity = entityIn(field);
	if (entity === undefined) throw new Error(`[ERROR] filterOn: no entity in ${JSON.stringify(field)}`);
	const source = alias ?? defaultAlias(entity);
	return filterDef([from(source, entity)], condition(aliased(field, source)));
}

type InCondition<F, V extends ReadonlyArray<Value>> = {
	readonly In: {
		readonly Expressions: readonly [Aliased<F>];
		readonly Values: { readonly [I in keyof V]: readonly [ExpressionOf<V[I]>] };
	};
};

export function inValues<const F extends Expression, const V extends ReadonlyArray<Value>>(
	field: F,
	values: V,
	alias?: string,
): FilterDefinition<readonly [EntitySource], readonly [{ readonly Condition: InCondition<F, V> }]>;
export function inValues(field: Expression, values: ReadonlyArray<Value>, alias?: string): unknown {
	return filterOn(
		field,
		(f) =>
			isIn(
				[f],
				values.map((value) => [expressionOf(value)]),
			),
		alias,
	);
}

export function notIn<const F extends Expression, const V extends ReadonlyArray<Value>>(
	field: F,
	values: V,
	alias?: string,
): FilterDefinition<
	readonly [EntitySource],
	readonly [{ readonly Condition: { readonly Not: { readonly Expression: InCondition<F, V> } } }]
>;
export function notIn(field: Expression, values: ReadonlyArray<Value>, alias?: string): unknown {
	return filterOn(
		field,
		(f) =>
			not(
				isIn(
					[f],
					values.map((value) => [expressionOf(value)]),
				),
			),
		alias,
	);
}

export interface FilterOptions {
	readonly ordinal?: number;
	readonly filter?: unknown;
	readonly howCreated?: string;
	readonly isLockedInViewMode?: boolean;
	readonly isHiddenInViewMode?: boolean;
	readonly displayName?: string;
	readonly objects?: unknown;
}

export interface FilterBase<T extends string, N extends string, F> {
	readonly name: N;
	readonly field: F;
	readonly type: T;
}

export function filter<const T extends string, const N extends string, const F extends Expression>(
	type: T,
	name: N,
	field: F,
): FilterBase<T, N, F>;
export function filter<
	const T extends string,
	const N extends string,
	const F extends Expression,
	const O extends FilterOptions,
>(type: T, name: N, field: F, options: O): FilterBase<T, N, F> & O;
export function filter(type: string, name: string, field: Expression, options: FilterOptions = {}): unknown {
	const { ordinal, ...rest } = options;
	return ordinal === undefined ? { name, field, type, ...rest } : { name, ordinal, field, type, ...rest };
}

export function categorical<const N extends string, const F extends Expression>(
	name: N,
	field: F,
): FilterBase<"Categorical", N, F>;
export function categorical<
	const N extends string,
	const F extends Expression,
	const O extends FilterOptions,
>(name: N, field: F, options: O): FilterBase<"Categorical", N, F> & O;
export function categorical(name: string, field: Expression, options: FilterOptions = {}): unknown {
	return filter("Categorical", name, field, options);
}

export function advanced<const N extends string, const F extends Expression>(
	name: N,
	field: F,
): FilterBase<"Advanced", N, F>;
export function advanced<const N extends string, const F extends Expression, const O extends FilterOptions>(
	name: N,
	field: F,
	options: O,
): FilterBase<"Advanced", N, F> & O;
export function advanced(name: string, field: Expression, options: FilterOptions = {}): unknown {
	return filter("Advanced", name, field, options);
}
