import type { Expression } from "./expression.ts";
import type { FormattingInput, FormattingValue, Properties, PropertyOf } from "./formatting.ts";
import { toProperties } from "./properties.ts";
import { queryRefOf } from "./query.ts";

export type Target = string | Expression;

export interface FieldSelector {
	readonly metadata: string;
}

export const forField = (target: Target): FieldSelector => {
	const metadata = typeof target === "string" ? target : queryRefOf(target);
	if (metadata === undefined)
		throw new Error(`[ERROR] forField: cannot derive queryRef for ${JSON.stringify(target)}`);
	return { metadata };
};

export const MatchingOption = { instancesAndTotals: 0, instancesOnly: 1, totalsOnly: 2 } as const;

export type MatchingOption = (typeof MatchingOption)[keyof typeof MatchingOption];

export const wildcard = <const M extends MatchingOption = 1>(target: Target, matchingOption?: M) => ({
	data: [{ dataViewWildcard: { matchingOption: matchingOption ?? MatchingOption.instancesOnly } }],
	metadata: forField(target).metadata,
});

export type FieldEntries<K extends string, P extends ReadonlyArray<readonly [Target, unknown]>> = {
	readonly [I in keyof P]: P[I] extends readonly [Target, infer V]
		? { readonly properties: { readonly [Q in K]: PropertyOf<V> }; readonly selector: FieldSelector }
		: never;
};

export type FieldPropertyEntries<P extends ReadonlyArray<readonly [Target, FormattingInput]>> = {
	readonly [I in keyof P]: P[I] extends readonly [Target, infer V]
		? { readonly properties: Properties<V>; readonly selector: FieldSelector }
		: never;
};

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
