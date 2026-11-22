import type { Register, RegisterEntries } from "../register.ts";
import type catalog from "./objects.json";

type Catalog = typeof catalog;

export type CatalogVisual = keyof Catalog;

type Extras<R> = R extends { readonly visualObjects: infer O extends object } ? O : never;

type ExtraRoles<R> = R extends { readonly visualRoles: infer O extends object } ? O : never;

type ExtraObjectName<R, T extends string> =
	Extras<RegisterEntries<R>> extends infer E
		? E extends { readonly [P in T]: infer O }
			? keyof O & string
			: never
		: never;

type ExtraPropertyName<R, T extends string, K> =
	Extras<RegisterEntries<R>> extends infer E
		? E extends { readonly [P in T]: infer O }
			? K extends keyof O
				? O[K] & string
				: never
			: never
		: never;

type Objects<T extends CatalogVisual> = Catalog[T]["objects"];

export type ObjectNameOf<R, T extends CatalogVisual> = (keyof Objects<T> & string) | ExtraObjectName<R, T>;

export type PropertyNameOf<R, T extends CatalogVisual, K> =
	| (K extends keyof Objects<T> ? keyof Objects<T>[K] & string : never)
	| ExtraPropertyName<R, T, K>;

export type ObjectName<T extends CatalogVisual> = ObjectNameOf<Register, T>;

export type PropertyName<T extends CatalogVisual, K> = PropertyNameOf<Register, T, K>;

type ExtraRoleName<R, T extends string> =
	ExtraRoles<RegisterEntries<R>> extends infer E
		? E extends { readonly [P in T]: infer N }
			? N & string
			: never
		: never;

export type RoleNameOf<R, T extends CatalogVisual> =
	| (keyof Catalog[T]["roles"] & string)
	| ExtraRoleName<R, T>;

export type RoleName<T extends CatalogVisual> = RoleNameOf<Register, T>;

type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;

type Single<T> = [T] extends [CatalogVisual] ? (true extends IsUnion<T> ? never : T) : never;

type CheckEntry<R, T extends CatalogVisual, K, E> = E extends { readonly properties: infer P }
	? string extends keyof P
		? unknown
		: {
				readonly [Key in keyof E]: Key extends "properties"
					? {
							readonly [Q in keyof P]: Q extends PropertyNameOf<R, T, K>
								? unknown
								: `${T}.${K & string} has no property "${Q & string}". Run \`pbirkit visual ${T} ${K & string}\` to list its properties. Register visualObjects is only for names that Desktop writes in a saved report, not for typos`;
						}
					: unknown;
			}
	: unknown;

type CheckEntries<R, T extends CatalogVisual, K, E> = E extends readonly [unknown, ...ReadonlyArray<unknown>]
	? { readonly [I in keyof E]: CheckEntry<R, T, K, E[I]> }
	: E extends ReadonlyArray<infer X>
		? ReadonlyArray<CheckEntry<R, T, K, X>>
		: unknown;

export type CheckObjects<R, T extends CatalogVisual, O> = string extends keyof O
	? unknown
	: {
			readonly [K in keyof O]: K extends ObjectNameOf<R, T>
				? CheckEntries<R, T, K, O[K]>
				: `${T} has no object "${K & string}". Run \`pbirkit visual ${T}\` to list its objects. Register visualObjects is only for names that Desktop writes in a saved report, not for typos`;
		};

export type CheckRoles<R, T extends CatalogVisual, S> = [RoleNameOf<R, T>] extends [never]
	? unknown
	: string extends keyof S
		? unknown
		: {
				readonly [K in keyof S]: K extends RoleNameOf<R, T>
					? unknown
					: `${T} has no role "${K & string}". Run \`pbirkit visual ${T}\` to list its roles. Register visualRoles is only for roles that Desktop writes in a saved report, not for typos`;
			};

type Loose<O> = {
	readonly [K in keyof O]: O[K] extends ReadonlyArray<infer X>
		? O[K] extends { readonly length: infer L }
			? number extends L
				? ReadonlyArray<X>
				: O[K]
			: O[K]
		: O[K];
};

type Checks<T, O, S> = [Single<T>] extends [never]
	? { readonly visualType: T }
	: {
			readonly visualType: T;
			readonly objects?: (O | Loose<O>) & CheckObjects<Register, Single<T>, O>;
			readonly query?: { readonly queryState: S & CheckRoles<Register, Single<T>, S> };
		};

export type CheckedVisual<V, T, O, S> = V extends { readonly visual: infer C }
	? V & { readonly visual: C & Checks<T, O, S> }
	: V;
