import { Struct, Unknown, suspend } from "effect/Schema";
import type { Codec } from "effect/Schema";

import { oneKeyOf } from "#schemas/common/one-key.ts";
import type { OneKey } from "#schemas/common/one-key.ts";

import {
	QueryExpressionBaseFields,
	QueryNativeVisualCalcFields,
	queryDefinitions,
	queryExpressionKinds,
	querySparklineDataFields,
} from "./shared.ts";
import type { QueryDefinitions, QueryExpressionKindsOf, QuerySparklineDataFieldsOf } from "./shared.ts";
export * from "./shared.ts";

export const QueryNativeVisualCalc = Struct(QueryNativeVisualCalcFields);

export type QueryNativeVisualCalc = typeof QueryNativeVisualCalc.Type;

interface Recursion {
	readonly expression: QueryExpressionContainer;
}

type Definitions = QueryDefinitions<QueryExpressionContainer, typeof Unknown>;

export type QueryFilter = Definitions["QueryFilter"]["Type"];
export type QueryDefinition = Definitions["QueryDefinition"]["Type"];
export type FilterDefinition = Definitions["FilterDefinition"]["Type"];

const QueryExpressionBase = Struct(QueryExpressionBaseFields);

export type QueryExpressionKinds = QueryExpressionKindsOf<Recursion, typeof Unknown> & {
	readonly SparklineData: Struct.Type<QuerySparklineDataFieldsOf<QueryExpressionContainer>>;
	readonly NativeVisualCalculation: QueryNativeVisualCalc;
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
} = queryDefinitions(Expression, Unknown);

export const QuerySparklineDataExpression = Struct(querySparklineDataFields(Expression));

export const QueryExpressionContainer: Codec<QueryExpressionContainer> = oneKeyOf(
	QueryExpressionBase.fields,
	{
		...queryExpressionKinds(Expression, QueryFilter, QueryDefinition),
		SparklineData: QuerySparklineDataExpression,
		NativeVisualCalculation: QueryNativeVisualCalc,
	},
);
