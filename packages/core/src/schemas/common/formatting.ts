import { Array, Struct, Unknown, optionalKey } from "effect/Schema";
import type { $Array, Constraint, Top } from "effect/Schema";

export function formattingProperties<const K extends ReadonlyArray<string>>(
	...keys: K
): { readonly [P in K[number]]: optionalKey<Unknown> };
export function formattingProperties(...keys: ReadonlyArray<string>) {
	return Object.fromEntries(keys.map((key) => [key, optionalKey(Unknown)]));
}

export type FormattingObjects<S extends Constraint, P extends Struct.Fields> = Struct<{
	readonly [K in keyof P]: optionalKey<
		$Array<Struct<{ readonly selector: optionalKey<S>; readonly properties: P[K] }>>
	>;
}>;

export function formattingObjects<S extends Constraint, const P extends Struct.Fields>(
	selector: S,
	properties: P,
): FormattingObjects<S, P>;
export function formattingObjects(selector: Constraint, properties: Struct.Fields): Top {
	return Struct(
		Object.fromEntries(
			Object.entries(properties).map(([key, value]) => [
				key,
				optionalKey(Array(Struct({ selector: optionalKey(selector), properties: value }))),
			]),
		),
	);
}
