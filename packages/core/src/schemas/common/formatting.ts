import { Array, Struct, Unknown, optionalKey } from "effect/Schema";
import type { $Array, Constraint, Top } from "effect/Schema";

/**
 * Builds the fields of one formatting object from its property names. Each property is optional and takes any value.
 * A value is an expression, such as a literal or a theme color from `pbirkit/expr`, not a plain value.
 */
export function formattingProperties<const K extends ReadonlyArray<string>>(
	...keys: K
): { readonly [P in K[number]]: optionalKey<Unknown> };
export function formattingProperties(...keys: ReadonlyArray<string>) {
	return Object.fromEntries(keys.map((key) => [key, optionalKey(Unknown)]));
}

/** The type of a formatting `objects` block: each object name maps to a list of `{ selector?, properties }` entries. */
export type FormattingObjects<S extends Constraint, P extends Struct.Fields> = Struct<{
	readonly [K in keyof P]: optionalKey<
		$Array<Struct<{ readonly selector: optionalKey<S>; readonly properties: P[K] }>>
	>;
}>;

/**
 * Builds a formatting `objects` block from a selector schema and the objects that it allows.
 * Each object takes a list of entries. Each entry has an optional `selector` and its `properties`.
 */
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
