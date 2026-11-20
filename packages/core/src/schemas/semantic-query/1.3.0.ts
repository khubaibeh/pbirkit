import { Literals, Struct, optionalKey, suspend } from "effect/Schema";
import type { Codec } from "effect/Schema";

import { oneKeyOf } from "#schemas/common/one-key.ts";
import type { OneKey } from "#schemas/common/one-key.ts";

import { QueryVisualTopNExpression } from "./1.1.0.ts";
import { QueryNativeVisualCalc, QueryNativeVisualCalcDataType } from "./1.2.0.ts";
import {
	QueryExpressionBaseFields,
	queryDefinitions,
	queryExpressionKinds,
	querySparklineDataFields,
} from "./shared.ts";
import type { QueryDefinitions, QueryExpressionKindsOf, QuerySparklineDataFieldsOf } from "./shared.ts";
export * from "./shared.ts";
export { QueryNativeVisualCalc, QueryNativeVisualCalcDataType, QueryVisualTopNExpression };

export const SortDirection = Literals([1, 2]);

export type SortDirection = typeof SortDirection.Type;

export const ApplyCalculationGroupTo = Literals(["Sparkline", "Point"]);

export type ApplyCalculationGroupTo = typeof ApplyCalculationGroupTo.Type;

interface Recursion {
	readonly expression: QueryExpressionContainer;
}

type Definitions = QueryDefinitions<QueryExpressionContainer, typeof SortDirection>;

export type QueryFilter = Definitions["QueryFilter"]["Type"];
export type QueryDefinition = Definitions["QueryDefinition"]["Type"];
export type FilterDefinition = Definitions["FilterDefinition"]["Type"];

const QueryExpressionBase = Struct(QueryExpressionBaseFields);

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

export type EntitySource = typeof EntitySource.Type;
export type QuerySortClause = typeof QuerySortClause.Type;
export type Axis = typeof Axis.Type;
export type QueryTransform = typeof QueryTransform.Type;

export const QuerySparklineDataExpression = Struct({
	...querySparklineDataFields(Expression),
	ApplyCalculationGroupTo: optionalKey(ApplyCalculationGroupTo),
});

export type QuerySparklineDataExpression = typeof QuerySparklineDataExpression.Type;

export const QueryExpressionContainer: Codec<QueryExpressionContainer> = oneKeyOf(
	QueryExpressionBase.fields,
	{
		...queryExpressionKinds(Expression, QueryFilter, QueryDefinition),
		SparklineData: QuerySparklineDataExpression,
		NativeVisualCalculation: QueryNativeVisualCalc,
		VisualTopN: QueryVisualTopNExpression,
	},
);
