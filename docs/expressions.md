# Expressions

Read this when you write field references, values, filters or formatting, and want short code.

All helpers come from `pbirkit/expr`. Each helper returns the exact JSON that Desktop writes, so `pbirkit diff --bytes` stays clean.

## Fields

| Helper                                           | Builds                                            |
| ------------------------------------------------ | ------------------------------------------------- |
| `col(table, column)`                             | a column reference                                |
| `measure(table, name)`                           | a measure reference                               |
| `agg(field, Aggregate.Sum)`                      | an aggregation                                    |
| `hierarchy(...)`, `level(...)`, `variation(...)` | hierarchy and date variation references           |
| `project(field)`                                 | a projection with `queryRef` and `nativeQueryRef` |
| `role(...projections)`                           | the projections of one query role                 |
| `sort(...)`, `asc`, `desc`, `defaultSort`        | `sortDefinition`                                  |

## Values

| Helper                                                     | Builds                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `text("a")`, `double(1.5)`, `long(3)`, `bool(true)`, `nil` | literal values (`long(1.5)` and `double(NaN)` throw)                                                                |
| `literal(value)`                                           | the right literal for a JS value                                                                                    |
| `solid(color)`                                             | a solid color, from a hex string or `theme(...)`                                                                    |
| `theme(index, percent?)`                                   | a theme color slot                                                                                                  |
| `obj({...})`                                               | the `[{ properties }]` shape of an object in `objects` or `visualContainerObjects`. Plain JS values become literals |
| `forField(...)`, `wildcard(...)`, `perField(...)`          | selectors for per-field or per-series formatting                                                                    |

## Conditions and filters

| Helper                                                                               | Builds                         |
| ------------------------------------------------------------------------------------ | ------------------------------ |
| `eq`, `gt`, `gte`, `lt`, `lte`, `and`, `or`, `not`, `contains`, `startsWith`, `isIn` | conditions                     |
| `when(...)`                                                                          | conditional formatting rules   |
| `filterOn(field, ...)`                                                               | a filter definition            |
| `inValues(field, values)`, `notIn(field, values)`                                    | basic list filters             |
| `categorical`, `advanced`, `filter`                                                  | filter entries of a given type |

## Resources and bookmarks

| Helper                                                     | Builds                                  |
| ---------------------------------------------------------- | --------------------------------------- |
| `themeRef(...)`, `imageRef(...)`                           | links to a theme or image resource      |
| `filterState(name, type, expression, howCreated, filter?)` | one bookmark filter state               |
| `branch`, `toggled`, `nest`                                | expansion states for matrices and trees |

## When no helper fits

Write the JSON shape as a plain object. The schema still types it. `pbirkit import --idiomatic` uses this same rule: it writes a helper only where the helper rebuilds the exact input, and it keeps the plain shape elsewhere.
