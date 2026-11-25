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

/**
 * Points at a model table by name. `entity` in `pbirkit/expr` builds it.
 *
 * - `Schema`: The schema of the table. Leave it out for the default schema.
 * - `Entity`: The table name in the model.
 */
export const StandaloneSourceRefExpression = Struct({
	Schema: optionalKey(String),
	Entity: String,
});

export type StandaloneSourceRefExpression = typeof StandaloneSourceRefExpression.Type;

/**
 * Points at a table by its alias in the `From` of a query. `alias` in `pbirkit/expr` builds it.
 *
 * - `Source`: The `Name` of an entry in `From`.
 */
export const QuerySourceRefExpression = Struct({
	Source: String,
});

export type QuerySourceRefExpression = typeof QuerySourceRefExpression.Type;

/** A table reference: by model name, or by query alias. */
export const SourceRef = Union([StandaloneSourceRefExpression, QuerySourceRefExpression]);

export type SourceRef = typeof SourceRef.Type;

/**
 * How `Min` and `Max` treat mixed types.
 * `0` skips non-numeric values. `1` keeps them if the model can, else acts as `0`. `2` keeps them, or fails if the model cannot.
 */
export const IncludeAllTypes = Literals([0, 1, 2]);

export type IncludeAllTypes = typeof IncludeAllTypes.Type;

/**
 * The aggregate of an `Aggregation`. `Aggregate` in `pbirkit/expr` names them.
 * `0` sum, `1` average, `2` distinct count, `3` min, `4` max, `5` count of non-blank values, `6` median,
 * `7` standard deviation, `8` variance.
 */
export const QueryAggregateFunction = Literals([0, 1, 2, 3, 4, 5, 6, 7, 8]);

export type QueryAggregateFunction = typeof QueryAggregateFunction.Type;

/** A unit of time. `0` day, `1` week, `2` month, `3` year, `4` decade, `5` second, `6` minute, `7` hour. */
export const TimeUnit = Literals([0, 1, 2, 3, 4, 5, 6, 7]);

export type TimeUnit = typeof TimeUnit.Type;

/** An arithmetic operator. `0` add, `1` subtract, `2` multiply, `3` divide. */
export const ArithmeticOperatorKind = Literals([0, 1, 2, 3]);

export type ArithmeticOperatorKind = typeof ArithmeticOperatorKind.Type;

/** A comparison operator. `0` equal, `1` greater, `2` greater or equal, `3` less, `4` less or equal. */
export const QueryComparisonKind = Literals([0, 1, 2, 3, 4]);

export type QueryComparisonKind = typeof QueryComparisonKind.Type;

/** The kind of a `From` entry. `0` model table, the default. `1` report object, such as a page or visual. `2` table from `Expression`. */
export const EntitySourceType = Literals([0, 1, 2]);

export type EntitySourceType = typeof EntitySourceType.Type;

/**
 * A literal value, encoded as text. Use `text`, `double`, `long`, `bool` and `nil` in `pbirkit/expr`.
 *
 * - `Value`: `'text'` with `''` for a quote, `2.4D` double, `2.4M` decimal, `24L` integer, `true`, `null`,
 *   or `datetime'YYYY-MM-DDThh:mm:ss'`.
 */
export const QueryLiteralExpression = Struct({ Value: String });

export type QueryLiteralExpression = typeof QueryLiteralExpression.Type;

/** The current date and time. */
export const QueryNowExpression = Struct({});

export type QueryNowExpression = typeof QueryNowExpression.Type;

/** The model default value of a column. Use it only as `Right` of an equal `Comparison`. */
export const QueryDefaultValueExpression = Struct({});

export type QueryDefaultValueExpression = typeof QueryDefaultValueExpression.Type;

/** All roles of the visual. */
export const QueryAllRolesRefExpression = Struct({});

export type QueryAllRolesRefExpression = typeof QueryAllRolesRefExpression.Type;

/**
 * A value that matches any value of a column. Use it only as `Right` of an equal `Comparison`.
 *
 * - `DefaultValueOverridesAncestors`: When true, a default value override also overrides all ancestors on the
 *   attribute path.
 */
export const QueryAnyValueExpression = Struct({
	DefaultValueOverridesAncestors: optionalKey(Boolean),
});

export type QueryAnyValueExpression = typeof QueryAnyValueExpression.Type;

/** Points at a transform table in the query, by its `Name`. */
export const QueryTransformTableRefExpression = Struct({ Source: String });

export type QueryTransformTableRefExpression = typeof QueryTransformTableRefExpression.Type;

/**
 * Points at a column that a transform makes, by its role.
 *
 * - `Role`: The role of the column.
 * - `Transform`: The `Name` of the transform. Leave it out inside the output table of that transform.
 */
export const QueryTransformOutputRoleRefExpression = Struct({
	Role: String,
	Transform: optionalKey(String),
});

export type QueryTransformOutputRoleRefExpression = typeof QueryTransformOutputRoleRefExpression.Type;

/**
 * Points at a file in a resource package, such as an image.
 *
 * - `PackageName`: The package name, such as `RegisteredResources`.
 * - `PackageType`: The package type as a number.
 * - `ItemName`: The file name in the package.
 */
export const QueryResourcePackageItem = Struct({
	PackageName: String,
	PackageType: Finite,
	ItemName: String,
});

export type QueryResourcePackageItem = typeof QueryResourcePackageItem.Type;

/** Points at a role of the visual, by name. */
export const QueryRoleRefExpression = Struct({ Role: String });

export type QueryRoleRefExpression = typeof QueryRoleRefExpression.Type;

/** Points at a value in a smart narrative summary, by name. */
export const QuerySummaryValueRefExpression = Struct({ Name: String });

export type QuerySummaryValueRefExpression = typeof QuerySummaryValueRefExpression.Type;

/** Points at a `Select` item of the query, by its `Name`. */
export const QuerySelectRefExpression = Struct({ ExpressionName: String });

export type QuerySelectRefExpression = typeof QuerySelectRefExpression.Type;

/**
 * A color from the theme `dataColors`. `theme` in `pbirkit/expr` builds it.
 *
 * - `ColorId`: The index into `dataColors`.
 * - `Percent`: The shade, from `-1` darker to `1` lighter. `0` keeps the color.
 */
export const QueryThemeDataColorExpression = Struct({
	ColorId: Finite,
	Percent: Finite,
});

export type QueryThemeDataColorExpression = typeof QueryThemeDataColorExpression.Type;

/**
 * The fields of a visual calculation that all versions share.
 *
 * - `Language`: The language of `Expression`. It is always `dax`.
 * - `Expression`: The DAX of the calculation.
 * - `Name`: The calculation name.
 */
export const QueryNativeVisualCalcFields = {
	Language: Literal("dax"),
	Expression: String,
	Name: String,
};

/** Free name and value pairs on an expression or filter. */
export const Annotations = Record(String, Unknown);

export type Annotations = typeof Annotations.Type;

/**
 * The fields that any expression may carry next to its one kind key.
 *
 * - `Name`: A name for the expression. `SelectRef` and transform columns refer to it.
 * - `NativeReferenceName`: A second name. Visual calculations refer to it.
 * - `Annotations`: Extra name and value pairs.
 */
export const QueryExpressionBaseFields = {
	Name: optionalKey(String),
	NativeReferenceName: optionalKey(String),
	Annotations: optionalKey(Annotations),
};

/**
 * The fields of a sparkline that all versions share.
 *
 * - `Measure`: The measure that the sparkline plots.
 * - `Groupings`: The fields that set one point per value, such as a month column.
 * - `PointsPerSparkline`: The most points in one sparkline. It is always `52`.
 */
export const querySparklineDataFields = <E extends Constraint>(Expression: E) => ({
	Measure: Expression,
	Groupings: Array(Expression),
	PointsPerSparkline: optionalKey(Literal(52)),
});

/**
 * Builds the query and filter schemas of one version.
 *
 * - `QueryDefinition`: A full query: `From`, `Where`, `Select`, `OrderBy` and more.
 * - `QueryDefinition.From`: The tables. Each has an alias in `Name` that `SourceRef.Source` uses.
 * - `QueryDefinition.Where`: Filters on the data.
 * - `QueryDefinition.Select`: The expressions in the result.
 * - `QueryDefinition.OrderBy`: Sort clauses, in order.
 * - `QueryDefinition.GroupBy`: Extra groups that `Select` does not show.
 * - `QueryDefinition.VisualShape`: The axes and groups of the visual.
 * - `QueryDefinition.Transform`: Table steps to run in the query.
 * - `QueryDefinition.Top`: The most rows to return, by `OrderBy`.
 * - `FilterDefinition`: A filter: `From` and `Where` only. `filterDef` in `pbirkit/expr` builds it.
 * - `QueryFilter`: One `Where` entry. `Condition` must be true or false.
 *   `Target` sets the fields it applies to. It defaults to all plain columns in `Select`.
 * - `EntitySource`: One `From` entry. `Entity` is the model table, and `Name` is the alias.
 * - `QuerySortClause`: An `Expression` and a `Direction`.
 * - `Axis`: A named axis with ordered `Groups`. Each group has `Keys` and a `Subtotal` flag.
 * - `QueryTransform`: A named step that runs `Algorithm` on `Input` and gives `Output`.
 */
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

/**
 * Builds the expression kinds of one version. An expression holds exactly one of these keys.
 *
 * Fields and tables:
 * - `SourceRef`: A table, by model name or by query alias.
 * - `Column`, `Measure`: A column or measure. `Expression` is the table, and `Property` is the name.
 * - `Hierarchy`, `HierarchyLevel`: A hierarchy of a table, and a level of a hierarchy.
 * - `PropertyVariationSource`: A variation of a column, such as an auto date hierarchy.
 * - `GroupRef`: A model group column.
 * - `NativeColumn`, `NativeMeasure`: A column or measure in DAX, with its data type and format.
 *
 * Aggregates:
 * - `Aggregation`: `Function` over `Expression`. See `QueryAggregateFunction`.
 * - `Min`, `Max`, `Percentile`, `Discretize`: Those functions over `Expression`.
 *
 * Conditions:
 * - `Comparison`: `Left` and `Right` with `ComparisonKind`.
 * - `And`, `Or`, `Not`, `Exists`: Logic.
 * - `Between`: `Expression` within `LowerBound` and `UpperBound`, both inclusive.
 * - `In`: The `Expressions` tuple matches a tuple in `Values`, or a row of `Table`.
 * - `Contains`, `StartsWith`: Text tests. `Contains` ignores case.
 *
 * Values:
 * - `Literal`: A literal value. See `QueryLiteralExpression`.
 * - `Now`, `DateAdd`, `DateSpan`, `Floor`: Dates and rounding.
 * - `DefaultValue`, `AnyValue`: Special values for the `Right` of an equal `Comparison`.
 * - `Arithmetic`: `Left` and `Right` with `Operator`.
 * - `Conditional`: The `Value` of the first true case in `Cases`, else `DefaultValue`, else null.
 * - `ThemeDataColor`: A theme color.
 * - `ResourcePackageItem`: A file in a resource package.
 * - `FillRule`: A color scale over `Input`, for conditional formatting.
 *
 * Scope and references:
 * - `ScopedEval`: `Expression` in the scope of the columns in `Scope`.
 * - `FilteredEval`: `Expression` under the extra `Filters`.
 * - `Subquery`: A whole query.
 * - `SelectRef`, `RoleRef`, `AllRolesRef`, `SummaryValueRef`: References by name.
 * - `TransformTableRef`, `TransformOutputRoleRef`: References into transforms.
 */
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

/** The return type of `queryDefinitions` for one expression type. */
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

/** The names of the expression kinds that all versions share. */
export type QueryExpressionKindName = keyof ReturnType<typeof queryExpressionKinds<Top, Top, Top>>;

/** Carries the expression type of one version into the shared kind types. */
export interface QueryExpressionRecursion {
	readonly expression: unknown;
}

/** The kind types of one version, keyed by kind name. */
export type QueryExpressionKindsOf<R extends QueryExpressionRecursion, D extends Constraint> = {
	readonly [K in QueryExpressionKindName]: QueryExpressionKindTypes<R["expression"], D>[K];
};

/** The sparkline fields for one expression type. */
export type QuerySparklineDataFieldsOf<E> = ReturnType<typeof querySparklineDataFields<Codec<E>>>;
