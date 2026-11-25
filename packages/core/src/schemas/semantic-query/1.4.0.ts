import { String, Struct, StructWithRest, optionalKey, suspend } from "effect/Schema";
import type { Codec } from "effect/Schema";

import { oneKeyOf } from "#schemas/common/one-key.ts";
import type { OneKey } from "#schemas/common/one-key.ts";

import { QueryVisualTopNExpression } from "./1.1.0.ts";
import { QueryNativeVisualCalc, QueryNativeVisualCalcDataType } from "./1.2.0.ts";
import { ApplyCalculationGroupTo, SortDirection } from "./1.3.0.ts";
import {
	Annotations,
	QueryExpressionBaseFields,
	queryDefinitions,
	queryExpressionKinds,
	querySparklineDataFields,
} from "./shared.ts";
import type { QueryDefinitions, QueryExpressionKindsOf, QuerySparklineDataFieldsOf } from "./shared.ts";
export * from "./shared.ts";
export {
	ApplyCalculationGroupTo,
	QueryNativeVisualCalc,
	QueryNativeVisualCalcDataType,
	QueryVisualTopNExpression,
	SortDirection,
};

/** Marks a visual calculation as a custom total. */
export const QueryCustomTotalMetadata = Struct({ baseQueryName: String });

export type QueryCustomTotalMetadata = typeof QueryCustomTotalMetadata.Type;

/** The `Annotations` of an expression: free pairs plus `customTotalMetadata`. */
export const QueryExpressionAnnotations = StructWithRest(
	Struct({ customTotalMetadata: optionalKey(QueryCustomTotalMetadata) }),
	[Annotations],
);

export type QueryExpressionAnnotations = typeof QueryExpressionAnnotations.Type;

interface Recursion {
	readonly expression: QueryExpressionContainer;
}

type Definitions = QueryDefinitions<QueryExpressionContainer, typeof SortDirection>;

export type QueryFilter = Definitions["QueryFilter"]["Type"];
export type QueryDefinition = Definitions["QueryDefinition"]["Type"];
export type FilterDefinition = Definitions["FilterDefinition"]["Type"];

const QueryExpressionBase = Struct({
	...QueryExpressionBaseFields,
	Annotations: optionalKey(QueryExpressionAnnotations),
});

/** All expression kinds of 1.4.0: the shared kinds plus `SparklineData`, `NativeVisualCalculation` and `VisualTopN`. */
export type QueryExpressionKinds = QueryExpressionKindsOf<Recursion, typeof SortDirection> & {
	readonly SparklineData: Struct.Type<QuerySparklineDataFieldsOf<QueryExpressionContainer>> & {
		readonly ApplyCalculationGroupTo?: ApplyCalculationGroupTo;
	};
	readonly NativeVisualCalculation: QueryNativeVisualCalc;
	readonly VisualTopN: QueryVisualTopNExpression;
};

/** One expression: the base fields plus exactly one kind key. Use the helpers in `pbirkit/expr` to build it. */
export type QueryExpressionContainer = OneKey<typeof QueryExpressionBase.Type, QueryExpressionKinds>;

const Expression = suspend((): Codec<QueryExpressionContainer> => QueryExpressionContainer);

/** The query and filter schemas of 1.4.0. See `queryDefinitions` for each one. */
export const {
	QueryFilter,
	EntitySource,
	QuerySortClause,
	Axis,
	QueryTransform,
	QueryDefinition,
	FilterDefinition,
} = queryDefinitions(Expression, SortDirection);

export type EntitySource = typeof EntitySource.Type;
export type QuerySortClause = typeof QuerySortClause.Type;
export type Axis = typeof Axis.Type;
export type QueryTransform = typeof QueryTransform.Type;

/**
 * The data of a sparkline: `Measure` over `Groupings`.
 *
 * - `ApplyCalculationGroupTo`: Where a calculation group applies: to the whole sparkline, the default, or to
 *   each point.
 */
export const QuerySparklineDataExpression = Struct({
	...querySparklineDataFields(Expression),
	ApplyCalculationGroupTo: optionalKey(ApplyCalculationGroupTo),
});

export type QuerySparklineDataExpression = typeof QuerySparklineDataExpression.Type;

/** The schema of one expression. It fails on zero or several kind keys. */
export const QueryExpressionContainer: Codec<QueryExpressionContainer> = oneKeyOf(
	QueryExpressionBase.fields,
	{
		...queryExpressionKinds(Expression, QueryFilter, QueryDefinition),
		SparklineData: QuerySparklineDataExpression,
		NativeVisualCalculation: QueryNativeVisualCalc,
		VisualTopN: QueryVisualTopNExpression,
	},
);
