import type { Register, RegisterEntries } from "../register.ts";
import type { VisualType } from "../visual-type.ts";
import type catalog from "./objects.json";

type Catalog = typeof catalog;

type CatalogKey = keyof Catalog;

export type CatalogVisual = CatalogKey & VisualType;

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

type CatalogObjects<T extends CatalogKey> = Catalog[T]["objects"];

export type ObjectNameOf<R, T extends CatalogKey> =
	| (keyof CatalogObjects<T> & string)
	| ExtraObjectName<R, T>;

export type PropertyNameOf<R, T extends CatalogKey, K> =
	| (K extends keyof CatalogObjects<T> ? keyof CatalogObjects<T>[K] & string : never)
	| ExtraPropertyName<R, T, K>;

export type ObjectName<T extends CatalogKey> = ObjectNameOf<Register, T>;

export type PropertyName<T extends CatalogKey, K> = PropertyNameOf<Register, T, K>;

type ExtraRoleName<R, T extends string> =
	ExtraRoles<RegisterEntries<R>> extends infer E
		? E extends { readonly [P in T]: infer N }
			? N & string
			: never
		: never;

export type RoleNameOf<R, T extends CatalogKey> = (keyof Catalog[T]["roles"] & string) | ExtraRoleName<R, T>;

export type RoleName<T extends CatalogKey> = RoleNameOf<Register, T>;

type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;

type Single<T> = [T] extends [CatalogKey] ? (true extends IsUnion<T> ? never : T) : never;

type CheckEntry<R, T extends CatalogKey, K, E> = E extends { readonly properties: infer P }
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

type CheckEntries<R, T extends CatalogKey, K, E> = E extends readonly [unknown, ...ReadonlyArray<unknown>]
	? { readonly [I in keyof E]: CheckEntry<R, T, K, E[I]> }
	: E extends ReadonlyArray<infer X>
		? ReadonlyArray<CheckEntry<R, T, K, X>>
		: unknown;

export type CheckObjects<R, T extends CatalogKey, O> = string extends keyof O
	? unknown
	: {
			readonly [K in keyof O]: K extends ObjectNameOf<R, T>
				? CheckEntries<R, T, K, O[K]>
				: `${T} has no object "${K & string}". Run \`pbirkit visual ${T}\` to list its objects. Register visualObjects is only for names that Desktop writes in a saved report, not for typos`;
		};

export type CheckRoles<R, T extends CatalogKey, S> = [RoleNameOf<R, T>] extends [never]
	? unknown
	: string extends keyof S
		? unknown
		: {
				readonly [K in keyof S]: K extends RoleNameOf<R, T>
					? unknown
					: `${T} has no role "${K & string}". Run \`pbirkit visual ${T}\` to list its roles. Register visualRoles is only for roles that Desktop writes in a saved report, not for typos`;
			};

export type CheckedObjects<Type, Objects> = [Single<Type>] extends [never]
	? Objects
	: Objects & CheckObjects<Register, Single<Type>, Objects>;

export type CheckedRoles<Type, QueryState> = [Single<Type>] extends [never]
	? QueryState
	: QueryState & CheckRoles<Register, Single<Type>, QueryState>;

type Checks<T, O, S> = [Single<T>] extends [never]
	? { readonly visualType: T }
	: {
			readonly visualType: T;
			readonly objects?: CheckedObjects<T, O>;
			readonly query?: { readonly queryState: CheckedRoles<T, S> };
		};

export type CheckedVisual<V, T, O, S> = V extends { readonly visual: infer C }
	? V & { readonly visual: C & Checks<T, O, S> }
	: V;
