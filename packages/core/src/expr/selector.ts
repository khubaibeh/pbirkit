import type { Expression } from "./expression.ts";
import type { FormattingInput, FormattingValue, Properties, PropertyOf } from "./formatting.ts";
import { toProperties } from "./properties.ts";
import { queryRefOf } from "./query.ts";

/** A field to select: an expression, or its `queryRef` as text. */
export type Target = string | Expression;

/** A selector that matches one field, by its `queryRef`. */
export interface FieldSelector {
	readonly metadata: string;
}

/**
 * Builds a selector for one field, such as one tile of a card or one column of a table.
 * It throws when it cannot derive the `queryRef`.
 */
export const forField = (target: Target): FieldSelector => {
	const metadata = typeof target === "string" ? target : queryRefOf(target);
	if (metadata === undefined)
		throw new Error(`[ERROR] forField: cannot derive queryRef for ${JSON.stringify(target)}`);
	return { metadata };
};

/** The match options of `wildcard`. `instancesOnly` is the default. */
export const MatchingOption = { instancesAndTotals: 0, instancesOnly: 1, totalsOnly: 2 } as const;

/** One match option number. */
export type MatchingOption = (typeof MatchingOption)[keyof typeof MatchingOption];

/**
 * Builds a selector for every instance of a field. Pass `0` to match the totals too.
 * Add a state with a spread, such as `{ ...wildcard(f, 0), id: "default" }`.
 */
export const wildcard = <const M extends MatchingOption = 1>(target: Target, matchingOption?: M) => ({
	data: [{ dataViewWildcard: { matchingOption: matchingOption ?? MatchingOption.instancesOnly } }],
	metadata: forField(target).metadata,
});

/** The entries that `perField` builds with one key. */
export type FieldEntries<K extends string, P extends ReadonlyArray<readonly [Target, unknown]>> = {
	readonly [I in keyof P]: P[I] extends readonly [Target, infer V]
		? { readonly properties: { readonly [Q in K]: PropertyOf<V> }; readonly selector: FieldSelector }
		: never;
};

/** The entries that `perField` builds with whole property records. */
export type FieldPropertyEntries<P extends ReadonlyArray<readonly [Target, FormattingInput]>> = {
	readonly [I in keyof P]: P[I] extends readonly [Target, infer V]
		? { readonly properties: Properties<V>; readonly selector: FieldSelector }
		: never;
};

/**
 * Builds one entry per field, each with its own selector.
 * `perField("key", [[f1, v1], [f2, v2]])` sets one key. `perField([[f1, { ... }], ...])` sets whole records.
 */
export function perField<
	const K extends string,
	const P extends ReadonlyArray<readonly [Target, FormattingValue<K>]>,
>(key: K, pairs: P): FieldEntries<K, P>;
export function perField<const P extends ReadonlyArray<readonly [Target, FormattingInput]>>(
	pairs: P,
): FieldPropertyEntries<P>;
export function perField(
	first: string | ReadonlyArray<readonly [Target, unknown]>,
	second?: ReadonlyArray<readonly [Target, unknown]>,
): unknown {
	const pairs = typeof first === "string" ? (second ?? []) : first;
	return pairs.map(([target, value]) => ({
		properties: toProperties(typeof first === "string" ? { [first]: value } : isRecord(value) ? value : {}),
		selector: forField(target),
	}));
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null && !globalThis.Array.isArray(value);
