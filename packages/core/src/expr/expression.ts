import { Unknown } from "effect/Schema";
import type { Struct } from "effect/Schema";

import type { OneKey } from "#schemas/common/one-key.ts";
import type {
	QueryExpressionAnnotations,
	QueryNativeVisualCalc,
	SortDirection,
} from "#schemas/semantic-query/1.4.0.ts";
import { queryExpressionKinds } from "#schemas/semantic-query/shared.ts";
import type {
	QueryExpressionBaseFields,
	QueryExpressionKindName,
	QueryExpressionKindsOf,
	QuerySparklineDataFieldsOf,
} from "#schemas/semantic-query/shared.ts";

export type ExpressionKind =
	| QueryExpressionKindName
	| "SparklineData"
	| "NativeVisualCalculation"
	| "VisualTopN";

export type Expression = { readonly [K in ExpressionKind]: { readonly [P in K]: unknown } }[ExpressionKind];

interface FieldRecursion {
	readonly expression: Field;
}

type FieldBase = Omit<Struct.Type<typeof QueryExpressionBaseFields>, "Annotations"> & {
	readonly Annotations?: QueryExpressionAnnotations;
};

type FieldKinds = QueryExpressionKindsOf<FieldRecursion, typeof SortDirection> & {
	readonly SparklineData: Struct.Type<QuerySparklineDataFieldsOf<Field>>;
	readonly NativeVisualCalculation: QueryNativeVisualCalc;
};

export type Field = OneKey<FieldBase, FieldKinds>;

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
