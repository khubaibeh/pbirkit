import { Unknown } from "effect/Schema";

import { queryExpressionKinds } from "#schemas/semantic-query/shared.ts";
import type { QueryExpressionKindName } from "#schemas/semantic-query/shared.ts";

export type ExpressionKind =
	| QueryExpressionKindName
	| "SparklineData"
	| "NativeVisualCalculation"
	| "VisualTopN";

export type Expression = { readonly [K in ExpressionKind]: { readonly [P in K]: unknown } }[ExpressionKind];

const kinds: ReadonlySet<string> = new Set([
	...Object.keys(queryExpressionKinds(Unknown, Unknown, Unknown)),
	"SparklineData",
	"NativeVisualCalculation",
	"VisualTopN",
]);

export const isExpression = (value: unknown): value is Expression =>
	typeof value === "object" &&
	value !== null &&
	!globalThis.Array.isArray(value) &&
	Object.keys(value).some((key) => kinds.has(key));
