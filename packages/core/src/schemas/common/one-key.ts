import { Effect, SchemaIssue, SchemaParser } from "effect";
import { Struct, declareConstructor } from "effect/Schema";
import type { Codec, Top } from "effect/Schema";

/** A union where each member has the `Base` fields plus exactly one key of `Kinds`. */
export type OneKey<Base, Kinds> = {
	readonly [K in keyof Kinds]: Base & { readonly [P in K]: Kinds[K] };
}[keyof Kinds];

/** Maps each kind schema to its decoded type. */
export type KindTypes<Kinds extends Struct.Fields> = { readonly [K in keyof Kinds]: Kinds[K]["Type"] };

const kindMessage = (input: object, keys: ReadonlyArray<string>, base: ReadonlyArray<string>) => {
	const found = keys.filter((key) => Object.hasOwn(input, key));
	if (found.length > 1) return `Expected exactly one kind, got ${found.join(", ")}`;
	const unknown = Object.keys(input).filter((key) => !base.includes(key));
	if (unknown.length > 0) return `Unknown kind: ${unknown.join(", ")}`;
	return "Missing kind";
};

/**
 * Builds a schema for an object with the `base` fields and exactly one key of `kinds`.
 * It fails with a clear message on zero keys, several keys, or an unknown key.
 */
export function oneKeyOf<const B extends Struct.Fields, const K extends Struct.Fields>(
	base: B,
	kinds: K,
): Codec<OneKey<Struct.Type<B>, KindTypes<K>>>;
export function oneKeyOf(base: Struct.Fields, kinds: Struct.Fields): Top {
	const keys = Object.keys(kinds);
	const members = Object.entries(kinds).map(([key, kind]) => Struct({ [key]: kind, ...base }));
	return declareConstructor()(members, (codecs) => {
		const decoders = codecs.map((codec) => SchemaParser.decodeUnknownEffect(codec));
		return (input, ast, options) => {
			if (typeof input !== "object" || input === null || Array.isArray(input)) {
				return Effect.fail(new SchemaIssue.InvalidType(ast, input, options));
			}
			const [index, ...rest] = keys.flatMap((key, at) => (Object.hasOwn(input, key) ? [at] : []));
			const decode = index !== undefined && rest.length === 0 ? decoders[index] : undefined;
			if (decode === undefined) {
				const message = kindMessage(input, keys, Object.keys(base));
				return Effect.fail(new SchemaIssue.InvalidValue({ message }, input, options));
			}
			return decode(input, options);
		};
	});
}
