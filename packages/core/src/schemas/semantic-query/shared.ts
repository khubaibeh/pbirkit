import {
	Array,
	Boolean,
	Finite,
	Literal,
	Literals,
	optionalKey,
	Record,
	String,
	Struct,
	Union,
	Unknown,
} from "effect/Schema";
import type { Codec, Constraint, Top } from "effect/Schema";

import type { KindTypes } from "#schemas/common/one-key.ts";

export const StandaloneSourceRefExpression = Struct({
	Schema: optionalKey(String),
	Entity: String,
});

export type StandaloneSourceRefExpression = typeof StandaloneSourceRefExpression.Type;

export const QuerySourceRefExpression = Struct({
	Source: String,
});

export type QuerySourceRefExpression = typeof QuerySourceRefExpression.Type;

export const SourceRef = Union([StandaloneSourceRefExpression, QuerySourceRefExpression]);

export type SourceRef = typeof SourceRef.Type;

export const IncludeAllTypes = Literals([0, 1, 2]);

export type IncludeAllTypes = typeof IncludeAllTypes.Type;

export const QueryAggregateFunction = Literals([0, 1, 2, 3, 4, 5, 6, 7, 8]);

export type QueryAggregateFunction = typeof QueryAggregateFunction.Type;

export const TimeUnit = Literals([0, 1, 2, 3, 4, 5, 6, 7]);

export type TimeUnit = typeof TimeUnit.Type;

export const ArithmeticOperatorKind = Literals([0, 1, 2, 3]);

export type ArithmeticOperatorKind = typeof ArithmeticOperatorKind.Type;

export const QueryComparisonKind = Literals([0, 1, 2, 3, 4]);

export type QueryComparisonKind = typeof QueryComparisonKind.Type;

export const EntitySourceType = Literals([0, 1, 2]);

export type EntitySourceType = typeof EntitySourceType.Type;

export const QueryLiteralExpression = Struct({ Value: String });

export type QueryLiteralExpression = typeof QueryLiteralExpression.Type;

export const QueryNowExpression = Struct({});

export type QueryNowExpression = typeof QueryNowExpression.Type;

export const QueryDefaultValueExpression = Struct({});

export type QueryDefaultValueExpression = typeof QueryDefaultValueExpression.Type;

export const QueryAllRolesRefExpression = Struct({});

export type QueryAllRolesRefExpression = typeof QueryAllRolesRefExpression.Type;

export const QueryAnyValueExpression = Struct({
	DefaultValueOverridesAncestors: optionalKey(Boolean),
});

export type QueryAnyValueExpression = typeof QueryAnyValueExpression.Type;

export const QueryTransformTableRefExpression = Struct({ Source: String });

export type QueryTransformTableRefExpression = typeof QueryTransformTableRefExpression.Type;

export const QueryTransformOutputRoleRefExpression = Struct({
	Role: String,
	Transform: optionalKey(String),
});

export type QueryTransformOutputRoleRefExpression = typeof QueryTransformOutputRoleRefExpression.Type;

export const QueryResourcePackageItem = Struct({
	PackageName: String,
	PackageType: Finite,
	ItemName: String,
});

export type QueryResourcePackageItem = typeof QueryResourcePackageItem.Type;

export const QueryRoleRefExpression = Struct({ Role: String });

export type QueryRoleRefExpression = typeof QueryRoleRefExpression.Type;

export const QuerySummaryValueRefExpression = Struct({ Name: String });

export type QuerySummaryValueRefExpression = typeof QuerySummaryValueRefExpression.Type;

export const QuerySelectRefExpression = Struct({ ExpressionName: String });

export type QuerySelectRefExpression = typeof QuerySelectRefExpression.Type;

export const QueryThemeDataColorExpression = Struct({
	ColorId: Finite,
	Percent: Finite,
});

export type QueryThemeDataColorExpression = typeof QueryThemeDataColorExpression.Type;

export const QueryNativeVisualCalcFields = {
	Language: Literal("dax"),
	Expression: String,
	Name: String,
};

export const Annotations = Record(String, Unknown);

export type Annotations = typeof Annotations.Type;

export const QueryExpressionBaseFields = {
	Name: optionalKey(String),
	NativeReferenceName: optionalKey(String),
	Annotations: optionalKey(Annotations),
};

export const querySparklineDataFields = <E extends Constraint>(Expression: E) => ({
	Measure: Expression,
	Groupings: Array(Expression),
	PointsPerSparkline: optionalKey(Literal(52)),
});

export const queryDefinitions = <E extends Constraint, D extends Constraint>(Expression: E, Direction: D) => {
	const QueryFilter = Struct({
		Target: optionalKey(Array(Expression)),
		Condition: Expression,
		Annotations: optionalKey(Annotations),
	});

	const EntitySource = Struct({
		Name: String,
		Entity: optionalKey(String),
		Schema: optionalKey(String),
		Expression: optionalKey(Expression),
		Type: optionalKey(EntitySourceType),
	});

	const QuerySortClause = Struct({ Expression, Direction });

	const AxisGroup = Struct({ Keys: Array(Expression), Subtotal: Boolean });

	const Axis = Struct({ Groups: Array(AxisGroup), Name: String });

	const QueryTransformTableColumn = Struct({ Role: optionalKey(String), Expression });

	const QueryTransformTable = Struct({ Name: String, Columns: Array(QueryTransformTableColumn) });

	const QueryTransform = Struct({
		Name: String,
		Algorithm: String,
		Input: Struct({ Parameters: Array(Expression), Table: optionalKey(QueryTransformTable) }),
		Output: Struct({ Table: optionalKey(QueryTransformTable) }),
	});

	const QueryDefinition = Struct({
		Version: optionalKey(Literal(2)),
		From: Array(EntitySource),
		Where: optionalKey(Array(QueryFilter)),
		OrderBy: optionalKey(Array(QuerySortClause)),
		Select: Array(Expression),
		VisualShape: optionalKey(Array(Axis)),
		GroupBy: optionalKey(Array(Expression)),
		Transform: optionalKey(Array(QueryTransform)),
		Top: optionalKey(Finite),
	});

	const FilterDefinition = Struct({
		Version: optionalKey(Literal(2)),
		From: Array(EntitySource),
		Where: Array(QueryFilter),
	});

	return {
		QueryFilter,
		EntitySource,
		QuerySortClause,
		Axis,
		QueryTransform,
		QueryDefinition,
		FilterDefinition,
	};
};

export const queryExpressionKinds = <E extends Constraint, F extends Constraint, Q extends Constraint>(
	Expression: E,
	QueryFilter: F,
	QueryDefinition: Q,
) => {
	const PropertyOf = Struct({ Expression, Property: String });
	const Extremum = Struct({ IncludeAllTypes, Expression });
	const Binary = Struct({ Left: Expression, Right: Expression });
	const Unary = Struct({ Expression });
	const ContentCache = Struct({
		Dependencies: optionalKey(Array(Expression)),
		UnrecognizedIdentifiers: optionalKey(Boolean),
	});
	const NativeFields = {
		DataType: Finite,
		Expression: String,
		ExpressionContentCache: optionalKey(ContentCache),
		ProposedName: optionalKey(String),
		Format: optionalKey(String),
	};

	return {
		SourceRef,
		Column: PropertyOf,
		Measure: PropertyOf,
		Min: Extremum,
		Max: Extremum,
		Aggregation: Struct({ Function: QueryAggregateFunction, Expression }),
		Percentile: Struct({ Expression, K: Finite, Exclusive: optionalKey(Boolean) }),
		Hierarchy: Struct({ Expression, Hierarchy: String }),
		HierarchyLevel: Struct({ Expression, Level: String }),
		PropertyVariationSource: Struct({ Expression, Name: String, Property: String }),
		Subquery: Struct({ Query: QueryDefinition }),
		Discretize: Struct({ Expression, Count: Finite }),
		And: Binary,
		Between: Struct({ Expression, LowerBound: Expression, UpperBound: Expression }),
		In: Struct({
			Expressions: Array(Expression),
			Values: optionalKey(Array(Array(Expression))),
			Table: optionalKey(Expression),
		}),
		Or: Binary,
		Comparison: Struct({ ComparisonKind: QueryComparisonKind, Left: Expression, Right: Expression }),
		Not: Unary,
		Contains: Binary,
		StartsWith: Binary,
		Exists: Unary,
		Literal: QueryLiteralExpression,
		DateSpan: Struct({ TimeUnit, Expression }),
		DateAdd: Struct({ Amount: Finite, TimeUnit, Expression }),
		Now: QueryNowExpression,
		DefaultValue: QueryDefaultValueExpression,
		AnyValue: QueryAnyValueExpression,
		Arithmetic: Struct({ Left: Expression, Right: Expression, Operator: ArithmeticOperatorKind }),
		Floor: Struct({ Expression, Size: Finite, TimeUnit: optionalKey(TimeUnit) }),
		ScopedEval: Struct({ Expression, Scope: Array(Expression) }),
		FilteredEval: Struct({ Expression, Filters: Array(QueryFilter) }),
		TransformTableRef: QueryTransformTableRefExpression,
		TransformOutputRoleRef: QueryTransformOutputRoleRefExpression,
		FillRule: Struct({ Input: Expression, FillRule: Unknown }),
		GroupRef: Struct({ GroupedColumns: Array(Expression), Expression, Property: String }),
		ResourcePackageItem: QueryResourcePackageItem,
		RoleRef: QueryRoleRefExpression,
		SummaryValueRef: QuerySummaryValueRefExpression,
		AllRolesRef: QueryAllRolesRefExpression,
		SelectRef: QuerySelectRefExpression,
		ThemeDataColor: QueryThemeDataColorExpression,
		Conditional: Struct({
			Cases: Array(Struct({ Condition: Expression, Value: Expression })),
			DefaultValue: optionalKey(Expression),
		}),
		NativeMeasure: Struct({ ...NativeFields, Language: Literal("dax") }),
		NativeColumn: Struct({ ...NativeFields, Language: String, Source: Expression }),
	};
};

export type QueryDefinitions<E, D extends Constraint> = ReturnType<typeof queryDefinitions<Codec<E>, D>>;

type QueryExpressionKindTypes<E, D extends Constraint> = KindTypes<
	ReturnType<
		typeof queryExpressionKinds<
			Codec<E>,
			QueryDefinitions<E, D>["QueryFilter"],
			QueryDefinitions<E, D>["QueryDefinition"]
		>
	>
>;

export type QueryExpressionKindName = keyof ReturnType<typeof queryExpressionKinds<Top, Top, Top>>;

export interface QueryExpressionRecursion {
	readonly expression: unknown;
}

export type QueryExpressionKindsOf<R extends QueryExpressionRecursion, D extends Constraint> = {
	readonly [K in QueryExpressionKindName]: QueryExpressionKindTypes<R["expression"], D>[K];
};

export type QuerySparklineDataFieldsOf<E> = ReturnType<typeof querySparklineDataFields<Codec<E>>>;
