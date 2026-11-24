# Expressions

Read this before you write a field, a value, a format setting, a selector, a condition or a filter.

**Rule: use a helper from `pbirkit/expr` wherever one fits. Never write by hand the JSON that a helper builds.**

- **The output is the same.** Each helper returns the JSON that Desktop writes, so `pbirkit diff` stays clean.
- **The code is much shorter.** A typical visual shrinks to about a fifth of the plain JSON.
- **The helpers prevent silent errors.** Desktop ignores a wrong literal without a word. The helpers write `'text'`, `1D` and `1L` in the right form, and they derive `queryRef` and `nativeQueryRef` for you.
- **The types stay narrow.** Helpers keep literal types, so the catalog typecheck can see your field and object names.

Compare one title and one field, by hand:

```ts
visualContainerObjects: {
	title: [{ properties: {
		show: { expr: { Literal: { Value: "true" } } },
		text: { expr: { Literal: { Value: "'Revenue'" } } },
	} }],
},
query: { queryState: { Data: { projections: [{
	field: { Measure: { Expression: { SourceRef: { Entity: "Sales" } }, Property: "Revenue" } },
	queryRef: "Sales.Revenue",
	nativeQueryRef: "Revenue",
}] } } },
```

The same with helpers:

```ts
visualContainerObjects: { title: obj({ show: true, text: "Revenue" }) },
query: { queryState: { Data: role(project(measure("Sales", "Revenue"))) } },
```

`pbirkit import --idiomatic` writes the helper form for an imported report.

## Contents

- [Fields](#fields)
- [Query roles and sorting](#query-roles-and-sorting)
- [Values](#values)
- [Format settings](#format-settings)
- [Selectors](#selectors)
- [Conditions](#conditions)
- [Filters](#filters)
- [Links and bookmarks](#links-and-bookmarks)
- [When no helper fits](#when-no-helper-fits)

## Fields

| Helper                                          | Builds                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `col("Customer", "Region")`                     | a column                                                                                                     |
| `measure("Sales", "Revenue")`                   | a measure                                                                                                    |
| `agg("sum", col("Sales", "Qty"))`               | an aggregation. Also `avg`, `count`, `min`, `max`, `countNonNull`, `median`, `standardDeviation`, `variance` |
| `hierarchy("Date", "Calendar")`                 | a hierarchy                                                                                                  |
| `level(hierarchy(...), "Year")`                 | a hierarchy level                                                                                            |
| `variation("Orders", "Variation", "OrderDate")` | the Auto date/time variation of a date column. Wrap it in `hierarchy` and `level` to reach a level.          |
| `entity("Sales")`, `alias("s")`                 | the source of a field: a table, or a query alias                                                             |

Define each field once and reuse it. A typed field list in one module keeps names in one place:

```ts
export const measures = {
	revenue: measure("Sales", "Revenue"),
	growth: measure("Sales", "Revenue YoY %"),
} as const;
```

Type a field parameter of a builder as `ColumnExpression`, `MeasureExpression` or a union of both, from `pbirkit/expr`.

## Query roles and sorting

| Helper                                   | Builds                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `project(field)`                         | one projection, with `queryRef` and `nativeQueryRef` derived from the field                          |
| `project(field, { displayName: "Net" })` | a projection with options: `displayName`, `format`, `active`, `hidden`, `queryRef`, `nativeQueryRef` |
| `role(p1, p2)`                           | the projections of one query role                                                                    |
| `sort(desc(field))`, `sort(asc(field))`  | `sortDefinition`                                                                                     |
| `defaultSort(...)`                       | `sortDefinition` with `isDefaultSort: true`                                                          |

```ts
query: {
	queryState: {
		Category: role(project(col("Product", "Category"))),
		Y: role(project(measures.revenue, { displayName: "Net sales" })),
	},
	sortDefinition: sort(desc(measures.revenue)),
},
```

When two tables have a column with the same name, set `nativeQueryRef` to a unique name. Two equal names on one visual can give "Error fetching data".

## Values

`obj`, `entry` and `props` turn plain JS values into literals for you. Use a literal helper only where the plain value gives the wrong type.

| Plain value or helper    | Writes                      | Use it for                                    |
| ------------------------ | --------------------------- | --------------------------------------------- |
| `true`, `bool(true)`     | `true`                      | switches                                      |
| `12`, `double(12)`       | `12D`                       | sizes, widths, percentages                    |
| `long(2)`                | `2L`                        | integers, such as `labelPrecision` or a count |
| `"Revenue"`, `text(...)` | `'Revenue'`                 | text, colors, enum values                     |
| `nil`                    | `null`                      | an empty value                                |
| `literal("0D")`          | the literal as you write it | a form that no other helper covers            |

A plain number always becomes a double. Desktop ignores a double in a property that takes an integer, such as `labelPrecision`, so write `long(...)` there. The build warns when it finds one.

`v(value)` wraps one value as `{ expr }`, for a spot outside `obj` that needs it. `expressionOf(value)` returns the bare expression.

## Format settings

| Helper                      | Builds                                               |
| --------------------------- | ---------------------------------------------------- |
| `obj({ ... })`              | the `[{ properties }]` array of one object           |
| `obj({ ... }, selector)`    | the same, with a selector                            |
| `entry({ ... }, selector?)` | one entry, for an object with several entries        |
| `props({ ... })`            | the `properties` record alone                        |
| `solid("#1F6FEB")`          | a solid color                                        |
| `solid(theme(1, 0.4))`      | a theme color slot, with a shade as its second value |
| `style({ ... })`            | a typed record of format settings, kept for reuse    |

```ts
objects: {
	legend: obj({ show: true, fontSize: 10 }),
	dataPoint: [
		entry({ fill: solid(color.focus) }),
		entry({ fill: solid(color.context) }, forField(measures.priorYear)),
	],
},
```

Font keys (`fontFamily`, `fontSize` and keys that end in them) take only valid fonts and sizes from the scale. See [authoring.md](authoring.md#fonts).

## Selectors

A selector picks the part of the visual that an entry formats.

| Helper                                  | Picks                                                          |
| --------------------------------------- | -------------------------------------------------------------- |
| `forField(field)`                       | one field, such as one tile of a card or one column of a table |
| `wildcard(field)`                       | every instance of a field, without totals                      |
| `wildcard(field, 0)`                    | every instance and the totals.                                 |
| `perField("key", [[f1, v1], [f2, v2]])` | one entry per field, each with its own value of one key        |

Add a state with a spread: `{ ...wildcard(field, 0), id: "default" }`. Run `pbirkit visual TYPE OBJECT` to list the state ids that an object takes.

## Conditions

| Helper                                       | Builds                                    |
| -------------------------------------------- | ----------------------------------------- |
| `eq`, `gt`, `gte`, `lt`, `lte`               | a comparison of two expressions           |
| `and`, `or`, `not`                           | a logical condition                       |
| `contains`, `startsWith`, `isIn`             | text and list conditions                  |
| `when([[condition, value], ...], fallback?)` | a conditional value: the first match wins |

A conditional color goes inside `solid(...)`, with text values for the colors:

```ts
const bySign = (field: Field) =>
	solid(
		when(
			[
				[gt(field, double(0)), text(color.good)],
				[lt(field, double(0)), text(color.bad)],
			],
			text(color.neutral),
		),
	);

objects: { value: [entry({ fontColor: bySign(measures.growth) }, wildcard(measures.growth))] },
```

A rule without `solid(...)` typechecks, but Desktop does not apply it.

## Filters

| Helper                                                              | Builds                                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `inValues(field, ["North", "South"])`                               | a list filter: the field is one of these values             |
| `notIn(field, [...])`                                               | the opposite list filter                                    |
| `filterOn(field, (f) => condition)`                                 | a filter with any condition on the field                    |
| `categorical(name, field, options?)`                                | a filter entry of type `Categorical`                        |
| `advanced(name, field, options?)`                                   | a filter entry of type `Advanced`                           |
| `filter(type, name, field, options?)`                               | a filter entry of any type                                  |
| `filterDef(from, ...conditions)`, `from`, `aliased`, `defaultAlias` | the parts, for a filter that the helpers above do not cover |

The `options` of a filter entry take `filter`, `ordinal`, `howCreated`, `displayName`, `isLockedInViewMode`, `isHiddenInViewMode` and `objects`.

```ts
filterConfig: {
	filters: [categorical("region", col("Customer", "Region"), { filter: inValues(col("Customer", "Region"), ["North"]) })],
},
```

## Links and bookmarks

| Helper                                                     | Builds                                 |
| ---------------------------------------------------------- | -------------------------------------- |
| `imageRef(image)`                                          | a link to an image resource            |
| `filterState(name, type, expression, howCreated, filter?)` | one bookmark filter                    |
| `branch`, `toggled`, `nest`                                | expansion states of matrices and trees |

## When no helper fits

Some shapes have no helper, such as a gradient fill rule or a Top N subquery.

1. Write the shape as a plain object. The schema still types it.
2. Use helpers for the parts inside it: fields, literals and colors.
3. If you need the shape twice, wrap it in a helper of your own and reuse that.

```ts
const scale = (field: Field, low: Hex, high: Hex) => ({
	solid: {
		color: {
			expr: {
				FillRule: {
					Input: field,
					FillRule: {
						linearGradient2: {
							min: { color: text(low) },
							max: { color: text(high) },
							nullColoringStrategy: { strategy: text("noColor") },
						},
					},
				},
			},
		},
	},
});
```

Tell the person when you add a shape by hand. It has no helper behind it, so it is the first place to look when Desktop ignores a setting.
