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

export const QueryCustomTotalMetadata = Struct({ baseQueryName: String });

export type QueryCustomTotalMetadata = typeof QueryCustomTotalMetadata.Type;

export const QueryExpressionAnnotations = StructWithRest(
	Struct({ customTotalMetadata: optionalKey(QueryCustomTotalMetadata) }),
	[Annotations],
);

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

export type QueryExpressionKinds = QueryExpressionKindsOf<Recursion, typeof SortDirection> & {
	readonly SparklineData: Struct.Type<QuerySparklineDataFieldsOf<QueryExpressionContainer>> & {
		readonly ApplyCalculationGroupTo?: ApplyCalculationGroupTo;
	};
	readonly NativeVisualCalculation: QueryNativeVisualCalc;
	readonly VisualTopN: QueryVisualTopNExpression;
};

export type QueryExpressionContainer = OneKey<typeof QueryExpressionBase.Type, QueryExpressionKinds>;

const Expression = suspend((): Codec<QueryExpressionContainer> => QueryExpressionContainer);

export const {
	QueryFilter,
	EntitySource,
	QuerySortClause,
	Axis,
	QueryTransform,
	QueryDefinition,
	FilterDefinition,
} = queryDefinitions(Expression, SortDirection);

export const QuerySparklineDataExpression = Struct({
	...querySparklineDataFields(Expression),
	ApplyCalculationGroupTo: optionalKey(ApplyCalculationGroupTo),
});

export const QueryExpressionContainer: Codec<QueryExpressionContainer> = oneKeyOf(
	QueryExpressionBase.fields,
	{
		...queryExpressionKinds(Expression, QueryFilter, QueryDefinition),
		SparklineData: QuerySparklineDataExpression,
		NativeVisualCalculation: QueryNativeVisualCalc,
		VisualTopN: QueryVisualTopNExpression,
	},
);
