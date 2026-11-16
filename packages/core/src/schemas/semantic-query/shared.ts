import {
	Array,
	Boolean,
	Literal,
	Literals,
	Number,
	Record,
	String,
	Struct,
	Union,
	Unknown,
	optionalKey,
} from "effect/Schema";
import type { Codec, Constraint, Top } from "effect/Schema";

import type { KindTypes } from "#schemas/common/one-key.ts";

export const StandaloneSourceRefExpression = Struct({
	Schema: optionalKey(String),
	Entity: String,
});

export const QuerySourceRefExpression = Struct({
	Source: String,
});

export const SourceRef = Union([StandaloneSourceRefExpression, QuerySourceRefExpression]);

export const IncludeAllTypes = Literals([0, 1, 2]);

export const QueryAggregateFunction = Literals([0, 1, 2, 3, 4, 5, 6, 7, 8]);

export const TimeUnit = Literals([0, 1, 2, 3, 4, 5, 6, 7]);

export const ArithmeticOperatorKind = Literals([0, 1, 2, 3]);

export const QueryComparisonKind = Literals([0, 1, 2, 3, 4]);

export const EntitySourceType = Literals([0, 1, 2]);

export const QueryLiteralExpression = Struct({ Value: String });

export const QueryNowExpression = Struct({});

export const QueryDefaultValueExpression = Struct({});

export const QueryAllRolesRefExpression = Struct({});

export const QueryAnyValueExpression = Struct({
	DefaultValueOverridesAncestors: optionalKey(Boolean),
});

export const QueryTransformTableRefExpression = Struct({ Source: String });

export const QueryTransformOutputRoleRefExpression = Struct({
	Role: String,
	Transform: optionalKey(String),
});

export const QueryResourcePackageItem = Struct({
	PackageName: String,
	PackageType: Number,
	ItemName: String,
});

export const QueryRoleRefExpression = Struct({ Role: String });

export const QuerySummaryValueRefExpression = Struct({ Name: String });

export const QuerySelectRefExpression = Struct({ ExpressionName: String });

export const QueryThemeDataColorExpression = Struct({
	ColorId: Number,
	Percent: Number,
});

export const QueryNativeVisualCalcFields = {
	Language: Literal("dax"),
	Expression: String,
	Name: String,
};

export const Annotations = Record(String, Unknown);

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
		Top: optionalKey(Number),
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
		DataType: Number,
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
		Percentile: Struct({ Expression, K: Number, Exclusive: optionalKey(Boolean) }),
		Hierarchy: Struct({ Expression, Hierarchy: String }),
		HierarchyLevel: Struct({ Expression, Level: String }),
		PropertyVariationSource: Struct({ Expression, Name: String, Property: String }),
		Subquery: Struct({ Query: QueryDefinition }),
		Discretize: Struct({ Expression, Count: Number }),
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
		DateAdd: Struct({ Amount: Number, TimeUnit, Expression }),
		Now: QueryNowExpression,
		DefaultValue: QueryDefaultValueExpression,
		AnyValue: QueryAnyValueExpression,
		Arithmetic: Struct({ Left: Expression, Right: Expression, Operator: ArithmeticOperatorKind }),
		Floor: Struct({ Expression, Size: Number, TimeUnit: optionalKey(TimeUnit) }),
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
