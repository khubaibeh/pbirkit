import { Array as Arr, Option, Predicate, Record } from "effect";
import {
	Array as ArraySchema,
	Boolean as BooleanSchema,
	declare,
	decodeUnknownOption,
	Finite,
	Literal,
	Literals,
	optionalKey,
	Record as RecordSchema,
	String as StringSchema,
	Struct,
	Tuple,
	Unknown,
} from "effect/Schema";
import type { ConstraintDecoder } from "effect/Schema";
import { omit } from "effect/Struct";

import * as expr from "@pbirkit/core/expr";
import { isBuiltinFont, isFontKey, isFontSize, isFontSizeKey } from "@pbirkit/core/font";

export interface HelperMatch {
	readonly name: string;
	readonly args: Option.Option<ReadonlyArray<unknown>>;
}

type Raw = Record.ReadonlyRecord<string, unknown>;

type Plain = string | number | boolean;

type Rule = (raw: Raw) => Option.Option<HelperMatch>;

export class RecordArg {
	readonly fields: Raw;

	constructor(fields: Raw) {
		this.fields = fields;
	}
}

const HELPERS: Raw = expr;

const callOf = (name: string, args: ReadonlyArray<unknown>): HelperMatch => ({
	name,
	args: Option.some(args),
});

const constantOf = (name: string): HelperMatch => ({ name, args: Option.none() });

const helper = (name: string, args: ReadonlyArray<unknown>): Option.Option<HelperMatch> =>
	Option.some(callOf(name, args));

const optional = <A>(value: A | undefined): ReadonlyArray<A> => Option.toArray(Option.fromUndefinedOr(value));

const isPlainObject = (value: unknown): value is Raw =>
	Predicate.isObject(value) && Object.getPrototypeOf(value) === Object.prototype;

const same = (left: unknown, right: unknown): boolean => {
	if (Object.is(left, right)) return true;
	if (Arr.isArray(left))
		return (
			Arr.isArray(right) &&
			left.length === right.length &&
			left.every((item, index) => same(item, right[index]))
		);
	if (!isPlainObject(left) || !isPlainObject(right)) return false;
	const keys = Object.keys(left);
	const other = Object.keys(right);
	return (
		keys.length === other.length &&
		keys.every((key, index) => key === other[index] && same(left[key], right[key]))
	);
};

const built = ({ name, args }: HelperMatch): Option.Option<unknown> => {
	const target = HELPERS[name];
	return Option.match(args, {
		onNone: () => Option.some(target),
		onSome: (list) =>
			Predicate.isFunction(target)
				? Option.liftThrowable((): unknown =>
						Reflect.apply(
							target,
							undefined,
							list.map((arg) => (arg instanceof RecordArg ? arg.fields : arg)),
						),
					)()
				: Option.none(),
	});
};

const builds = (match: HelperMatch, value: unknown): boolean =>
	Option.exists(built(match), (output) => same(output, value));

const isExpression = (input: unknown): input is expr.Expression => {
	if (!expr.isExpression(input)) return false;
	const [, second, ...rest] = Object.keys(input);
	return rest.length === 0 && (second === undefined || second === "Annotations");
};

const Expression = declare(isExpression);

const EXACT = { onExcessProperty: "error" } as const;

const rule = <S extends ConstraintDecoder<unknown>>(
	schema: S,
	toMatch: (node: S["Type"], raw: Raw) => Option.Option<HelperMatch>,
): Rule => {
	const decode = decodeUnknownOption(schema, EXACT);
	return (raw) => Option.flatMap(decode(raw), (node) => toMatch(node, raw));
};

const nameOf = (names: Record.ReadonlyRecord<string, number>, id: number): Option.Option<string> =>
	Option.map(
		Arr.findFirst(Object.entries(names), ([, value]) => value === id),
		([name]) => name,
	);

const EntityRef = decodeUnknownOption(Struct({ SourceRef: Struct({ Entity: StringSchema }) }), EXACT);

const sourceOf = (expression: expr.Expression): string | expr.Expression =>
	Option.match(EntityRef(expression), {
		onSome: ({ SourceRef }) => SourceRef.Entity,
		onNone: () => expression,
	});

const plainOf = (text: string, value: unknown): Option.Option<readonly [string, Plain]> =>
	Arr.findFirst(
		[
			...Option.toArray(
				Option.map(Option.fromUndefinedOr(expr.textOf(value)), (decoded) => ["text", decoded] as const),
			),
			["bool", text === "true"] as const,
			["double", Number(text.slice(0, -1))] as const,
		],
		([name, plain]) => builds(callOf(name, [plain]), value),
	);

const literalOf = (text: string, value: unknown): HelperMatch =>
	Option.match(plainOf(text, value), {
		onSome: ([name, plain]) => callOf(name, [plain]),
		onNone: () =>
			Option.getOrElse(
				Arr.findFirst([constantOf("nil"), callOf("long", [Number(text.slice(0, -1))])], (match) =>
					builds(match, value),
				),
				() => callOf("literal", [text]),
			),
	});

const LiteralNode = decodeUnknownOption(Struct({ Literal: Struct({ Value: StringSchema }) }), EXACT);

const plainValue = (
	expression: expr.Expression,
	accepts: (plain: Plain) => boolean,
): Plain | expr.Expression =>
	LiteralNode(expression).pipe(
		Option.flatMap(({ Literal: { Value } }) => plainOf(Value, expression)),
		Option.map(([, plain]) => plain),
		Option.filter(accepts),
		Option.getOrElse((): Plain | expr.Expression => expression),
	);

const fitsKey =
	(key: string) =>
	(plain: Plain): boolean => {
		if (isFontKey(key)) return Predicate.isString(plain) && isBuiltinFont(plain);
		return !isFontSizeKey(key) || isFontSize(plain);
	};

const PropertyExpression = decodeUnknownOption(Struct({ expr: Expression }), EXACT);

const inputOf = ([key, item]: readonly [string, unknown]): Option.Option<readonly [string, unknown]> =>
	key === "paragraphs"
		? Option.none()
		: Option.match(PropertyExpression(item), {
				onSome: ({ expr: expression }) => Option.some([key, plainValue(expression, fitsKey(key))] as const),
				onNone: () =>
					isFontKey(key) || isFontSizeKey(key) ? Option.none() : Option.some([key, item] as const),
			});

const Entry = Struct({ properties: RecordSchema(StringSchema, Unknown), selector: optionalKey(Unknown) });

const entryArgs = ({ properties, selector }: typeof Entry.Type): Option.Option<ReadonlyArray<unknown>> =>
	Option.map(Option.all(Object.entries(properties).map((entry) => inputOf(entry))), (entries) => [
		new RecordArg(Object.fromEntries(entries)),
		...optional(selector),
	]);

const projection = (
	{
		field,
		queryRef,
		nativeQueryRef,
	}: { readonly field: expr.Expression; readonly queryRef: string; readonly nativeQueryRef: string },
	raw: Raw,
): Option.Option<HelperMatch> => {
	const derived = Option.liftThrowable(() => expr.project(field))();
	const options = omit(raw, [
		"field",
		...(Option.exists(derived, (projected) => projected.queryRef === queryRef) ? ["queryRef"] : []),
		...(Option.exists(derived, (projected) => projected.nativeQueryRef === nativeQueryRef)
			? ["nativeQueryRef"]
			: []),
	]);
	return helper("project", Record.isEmptyReadonlyRecord(options) ? [field] : [field, new RecordArg(options)]);
};

const filterOf = (
	{ name, field, type }: { readonly name: string; readonly field: expr.Expression; readonly type: string },
	raw: Raw,
): Option.Option<HelperMatch> => {
	const options = omit(raw, ["name", "field", "type"]);
	const rest = Record.isEmptyReadonlyRecord(options) ? [] : [new RecordArg(options)];
	if (type === "Categorical") return helper("categorical", [name, field, ...rest]);
	if (type === "Advanced") return helper("advanced", [name, field, ...rest]);
	return helper("filter", [type, name, field, ...rest]);
};

const SortClause = Struct({ field: Expression, direction: Literals(["Ascending", "Descending"]) });

const Operands = Struct({ Left: Expression, Right: Expression });

const EntitySource = Struct({ Name: StringSchema, Entity: StringSchema, Type: Literal(0) });

const RULES: ReadonlyMap<string, ReadonlyArray<Rule>> = new Map(
	Object.entries({
		SourceRef: [
			rule(Struct({ SourceRef: Struct({ Entity: StringSchema }) }), ({ SourceRef }) =>
				helper("entity", [SourceRef.Entity]),
			),
			rule(Struct({ SourceRef: Struct({ Source: StringSchema }) }), ({ SourceRef }) =>
				helper("alias", [SourceRef.Source]),
			),
		],
		Column: [
			rule(Struct({ Column: Struct({ Expression, Property: StringSchema }) }), ({ Column }) =>
				helper("col", [sourceOf(Column.Expression), Column.Property]),
			),
		],
		Measure: [
			rule(Struct({ Measure: Struct({ Expression, Property: StringSchema }) }), ({ Measure }) =>
				helper("measure", [sourceOf(Measure.Expression), Measure.Property]),
			),
		],
		Hierarchy: [
			rule(Struct({ Hierarchy: Struct({ Expression, Hierarchy: StringSchema }) }), ({ Hierarchy }) =>
				helper("hierarchy", [sourceOf(Hierarchy.Expression), Hierarchy.Hierarchy]),
			),
		],
		HierarchyLevel: [
			rule(Struct({ HierarchyLevel: Struct({ Expression, Level: StringSchema }) }), ({ HierarchyLevel }) =>
				helper("level", [HierarchyLevel.Expression, HierarchyLevel.Level]),
			),
		],
		PropertyVariationSource: [
			rule(
				Struct({
					PropertyVariationSource: Struct({ Expression, Name: StringSchema, Property: StringSchema }),
				}),
				({ PropertyVariationSource: variation }) =>
					helper("variation", [sourceOf(variation.Expression), variation.Name, variation.Property]),
			),
		],
		Aggregation: [
			rule(Struct({ Aggregation: Struct({ Expression, Function: Finite }) }), ({ Aggregation }) =>
				Option.flatMap(nameOf(expr.Aggregate, Aggregation.Function), (name) =>
					helper("agg", [name, Aggregation.Expression]),
				),
			),
		],
		Literal: [
			rule(Struct({ Literal: Struct({ Value: StringSchema }) }), ({ Literal: { Value } }, raw) =>
				Option.some(literalOf(Value, raw)),
			),
		],
		ThemeDataColor: [
			rule(
				Struct({ ThemeDataColor: Struct({ ColorId: Finite, Percent: Finite }) }),
				({ ThemeDataColor: { ColorId, Percent } }) =>
					helper("theme", Percent === 0 ? [ColorId] : [ColorId, Percent]),
			),
		],
		Comparison: [
			rule(
				Struct({ Comparison: Struct({ ComparisonKind: Finite, Left: Expression, Right: Expression }) }),
				({ Comparison }) =>
					Option.flatMap(nameOf(expr.ComparisonKind, Comparison.ComparisonKind), (name) =>
						helper(name, [Comparison.Left, Comparison.Right]),
					),
			),
		],
		And: [rule(Struct({ And: Operands }), ({ And }) => helper("and", [And.Left, And.Right]))],
		Or: [rule(Struct({ Or: Operands }), ({ Or }) => helper("or", [Or.Left, Or.Right]))],
		Contains: [
			rule(Struct({ Contains: Operands }), ({ Contains }) =>
				helper("contains", [Contains.Left, Contains.Right]),
			),
		],
		StartsWith: [
			rule(Struct({ StartsWith: Operands }), ({ StartsWith }) =>
				helper("startsWith", [StartsWith.Left, StartsWith.Right]),
			),
		],
		Not: [rule(Struct({ Not: Struct({ Expression }) }), ({ Not }) => helper("not", [Not.Expression]))],
		In: [
			rule(
				Struct({
					In: Struct({ Expressions: ArraySchema(Expression), Values: ArraySchema(ArraySchema(Expression)) }),
				}),
				({ In }) => helper("isIn", [In.Expressions, In.Values]),
			),
		],
		Conditional: [
			rule(
				Struct({
					Conditional: Struct({
						Cases: ArraySchema(Struct({ Condition: Expression, Value: Expression })),
						DefaultValue: optionalKey(Expression),
					}),
				}),
				({ Conditional: { Cases, DefaultValue } }) =>
					helper("when", [
						Cases.map(({ Condition, Value }) => [Condition, Value]),
						...optional(DefaultValue),
					]),
			),
		],
		solid: [
			rule(Struct({ solid: Struct({ color: Struct({ expr: Expression }) }) }), ({ solid }) =>
				helper("solid", [plainValue(solid.color.expr, Predicate.isString)]),
			),
		],
		expr: [rule(Struct({ expr: Expression }), (node) => helper("v", [plainValue(node.expr, () => true)]))],
		projections: [
			rule(Struct({ projections: ArraySchema(Unknown) }), ({ projections }) => helper("role", projections)),
		],
		sort: [
			rule(Struct({ sort: ArraySchema(SortClause) }), ({ sort }) => helper("sort", sort)),
			rule(Struct({ sort: ArraySchema(SortClause), isDefaultSort: Literal(true) }), ({ sort }) =>
				helper("defaultSort", sort),
			),
		],
		field: [
			rule(
				Struct({ field: Expression, direction: Literals(["Ascending", "Descending"]) }),
				({ field, direction }) => helper(direction === "Ascending" ? "asc" : "desc", [field]),
			),
			rule(
				Struct({
					field: Expression,
					queryRef: StringSchema,
					nativeQueryRef: StringSchema,
					displayName: optionalKey(StringSchema),
					format: optionalKey(StringSchema),
					active: optionalKey(BooleanSchema),
					hidden: optionalKey(BooleanSchema),
				}),
				projection,
			),
		],
		properties: [rule(Entry, (node) => Option.flatMap(entryArgs(node), (args) => helper("entry", args)))],
		Name: [
			rule(Struct({ Name: StringSchema, Entity: StringSchema, Type: Literal(0) }), ({ Name, Entity }) =>
				helper("from", [Name, Entity]),
			),
		],
		Version: [
			rule(
				Struct({
					Version: Literal(2),
					From: ArraySchema(EntitySource),
					Where: ArraySchema(Struct({ Condition: Expression })),
				}),
				({ From, Where }) => helper("filterDef", [From, ...Where.map(({ Condition }) => Condition)]),
			),
		],
		data: [
			rule(
				Struct({
					data: Tuple([
						Struct({
							dataViewWildcard: Struct({ matchingOption: Literals(Object.values(expr.MatchingOption)) }),
						}),
					]),
					metadata: StringSchema,
				}),
				({ data: [{ dataViewWildcard }], metadata }) =>
					helper(
						"wildcard",
						dataViewWildcard.matchingOption === expr.MatchingOption.instancesOnly
							? [metadata]
							: [metadata, dataViewWildcard.matchingOption],
					),
			),
		],
		name: [
			rule(
				Struct({
					name: StringSchema,
					type: StringSchema,
					expression: Expression,
					howCreated: Literals([0, 1, 2, 3, 4, 5, 6, 7]),
					filter: optionalKey(Unknown),
				}),
				({ name, type, expression, howCreated, filter }) =>
					helper("filterState", [name, type, expression, howCreated, ...optional(filter)]),
			),
			rule(
				Struct({
					name: StringSchema,
					ordinal: optionalKey(Finite),
					field: Expression,
					type: StringSchema,
					filter: optionalKey(Unknown),
					howCreated: optionalKey(StringSchema),
					isLockedInViewMode: optionalKey(BooleanSchema),
					isHiddenInViewMode: optionalKey(BooleanSchema),
					displayName: optionalKey(StringSchema),
					objects: optionalKey(Unknown),
				}),
				filterOf,
			),
		],
	}),
);

const Annotations = decodeUnknownOption(RecordSchema(StringSchema, Unknown));

const annotated = ({ Annotations: annotations, ...expression }: Raw): Option.Option<HelperMatch> =>
	isExpression(expression)
		? Option.flatMap(Annotations(annotations), (notes) =>
				helper("annotate", [expression, new RecordArg(notes)]),
			)
		: Option.none();

const SingleEntry = decodeUnknownOption(Tuple([Entry]), EXACT);

const matchOf = (value: unknown): Option.Option<HelperMatch> => {
	if (Arr.isArray(value))
		return Option.flatMap(SingleEntry(value), ([entry]) =>
			Option.flatMap(entryArgs(entry), (args) => helper("obj", args)),
		);
	if (!isPlainObject(value)) return Option.none();
	const rules = Arr.head(Object.keys(value)).pipe(
		Option.flatMap((key) => Option.fromUndefinedOr(RULES.get(key))),
		Option.getOrElse((): ReadonlyArray<Rule> => []),
	);
	return Option.orElse(
		Arr.findFirst(rules, (match) => match(value)),
		() => annotated(value),
	);
};

export const helperMatch = (value: unknown): Option.Option<HelperMatch> =>
	Option.filter(matchOf(value), (found) => builds(found, value));
