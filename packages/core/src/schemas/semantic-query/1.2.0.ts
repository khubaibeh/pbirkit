import { Literals, Struct, Unknown, optionalKey, suspend } from "effect/Schema";
import type { Codec } from "effect/Schema";

import { oneKeyOf } from "#schemas/common/one-key.ts";
import type { OneKey } from "#schemas/common/one-key.ts";

import { QueryVisualTopNExpression } from "./1.1.0.ts";
import {
	QueryExpressionBaseFields,
	QueryNativeVisualCalcFields,
	queryDefinitions,
	queryExpressionKinds,
	querySparklineDataFields,
} from "./shared.ts";
import type { QueryDefinitions, QueryExpressionKindsOf, QuerySparklineDataFieldsOf } from "./shared.ts";
export * from "./shared.ts";
export { QueryVisualTopNExpression };

export const QueryNativeVisualCalcDataType = Literals([
	"Binary",
	"Boolean",
	"Date",
	"DateTime",
	"DateTimeZone",
	"Decimal",
	"Double",
	"Duration",
	"Integer",
	"Json",
	"None",
	"Null",
	"Text",
	"Time",
	"Variant",
]);

export type QueryNativeVisualCalcDataType = typeof QueryNativeVisualCalcDataType.Type;

export const QueryNativeVisualCalc = Struct({
	...QueryNativeVisualCalcFields,
	DataType: optionalKey(QueryNativeVisualCalcDataType),
});

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
} = queryDefinitions(Expression, Unknown);

export type EntitySource = typeof EntitySource.Type;
export type QuerySortClause = typeof QuerySortClause.Type;
export type Axis = typeof Axis.Type;
export type QueryTransform = typeof QueryTransform.Type;

export const QuerySparklineDataExpression = Struct(querySparklineDataFields(Expression));

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
