import { aliased, defaultAlias, from, inValues } from "pbirkit/expr";
import type { ColumnExpression, EntityRef, MeasureExpression } from "pbirkit/expr";

type Column = ColumnExpression<EntityRef>;
type Measure = MeasureExpression<EntityRef>;

const SORT_DIRECTION = { top: 2, bottom: 1 } as const;

const rankFilter = (category: Column, by: Measure, count: number, direction: "top" | "bottom") => {
	if (!Number.isSafeInteger(count) || count < 1)
		throw new RangeError(`${direction}N: count must be a positive integer, got ${count}`);
	const categoryEntity = category.Column.Expression.SourceRef.Entity;
	const measureEntity = by.Measure.Expression.SourceRef.Entity;
	const categoryAlias = defaultAlias(categoryEntity);
	const measureAlias = measureEntity === categoryEntity ? categoryAlias : defaultAlias(measureEntity);
	if (measureAlias === categoryAlias && measureEntity !== categoryEntity)
		throw new Error(`${direction}N: ${categoryEntity} and ${measureEntity} share the alias "${categoryAlias}"`);
	const sources =
		measureEntity === categoryEntity
			? [from(categoryAlias, categoryEntity)]
			: [from(categoryAlias, categoryEntity), from(measureAlias, measureEntity)];
	return {
		name: `${direction}-${count}`,
		field: category,
		type: "TopN" as const,
		filter: {
			Version: 2 as const,
			From: [
				{
					Name: "subquery",
					Expression: {
						Subquery: {
							Query: {
								Version: 2 as const,
								From: sources,
								Select: [{ ...aliased(category, categoryAlias), Name: "field" }],
								OrderBy: [{ Direction: SORT_DIRECTION[direction], Expression: aliased(by, measureAlias) }],
								Top: count,
							},
						},
					},
					Type: 2 as const,
				},
				from(categoryAlias, categoryEntity),
			],
			Where: [
				{
					Condition: {
						In: {
							Expressions: [aliased(category, categoryAlias)],
							Table: { SourceRef: { Source: "subquery" } },
						},
					},
				},
			],
		},
	};
};

export const topN = (category: Column, by: Measure, count: number) => rankFilter(category, by, count, "top");

export const bottomN = (category: Column, by: Measure, count: number) => rankFilter(category, by, count, "bottom");

export const only = (field: Column, values: ReadonlyArray<string | number | boolean>) => ({
	name: `only-${field.Column.Property.replaceAll(/[^A-Za-z0-9]/g, "")}`,
	field,
	type: "Categorical" as const,
	filter: inValues(field, values),
});

export type VisualFilter = ReturnType<typeof topN> | ReturnType<typeof only>;
