import type { Expression } from "./expression.ts";

const aggregateNames = [
	"Sum",
	"Avg",
	"Count",
	"Min",
	"Max",
	"CountNonNull",
	"Median",
	"StandardDeviation",
	"Variance",
];

export const at = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;

const string = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

export const entityOf = (value: unknown): string | undefined => string(at(at(value, "SourceRef"), "Entity"));

const join = (...parts: ReadonlyArray<string | undefined>): string | undefined =>
	parts.every((part) => part !== undefined) ? parts.join(".") : undefined;

export const queryRefOf = (field: unknown): string | undefined => {
	const property = at(field, "Column") ?? at(field, "Measure");
	if (property !== undefined)
		return join(entityOf(at(property, "Expression")), string(at(property, "Property")));
	const aggregation = at(field, "Aggregation");
	if (aggregation !== undefined) {
		const inner = queryRefOf(at(aggregation, "Expression"));
		const fn = at(aggregation, "Function");
		const name = typeof fn === "number" ? aggregateNames[fn] : undefined;
		return inner === undefined || name === undefined ? undefined : `${name}(${inner})`;
	}
	const level = at(field, "HierarchyLevel");
	const hierarchy = at(at(level, "Expression"), "Hierarchy");
	if (hierarchy === undefined) return undefined;
	const variation = at(at(hierarchy, "Expression"), "PropertyVariationSource");
	const base =
		variation === undefined
			? entityOf(at(hierarchy, "Expression"))
			: join(
					entityOf(at(variation, "Expression")),
					string(at(variation, "Property")),
					string(at(variation, "Name")),
				);
	return join(base, string(at(hierarchy, "Hierarchy")), string(at(level, "Level")));
};

const nativeQueryRefOf = (field: unknown): string | undefined => {
	const property = at(field, "Column") ?? at(field, "Measure");
	if (property !== undefined) return string(at(property, "Property"));
	const aggregation = at(field, "Aggregation");
	if (aggregation !== undefined) return nativeQueryRefOf(at(aggregation, "Expression"));
	return string(at(at(field, "HierarchyLevel"), "Level"));
};

export interface ProjectionOptions {
	readonly queryRef?: string;
	readonly nativeQueryRef?: string;
	readonly displayName?: string;
	readonly format?: string;
	readonly active?: boolean;
	readonly hidden?: boolean;
}

export interface BaseProjection<F> {
	readonly field: F;
	readonly queryRef: string;
	readonly nativeQueryRef: string;
}

export type Projection<F, O extends ProjectionOptions> = BaseProjection<F> &
	Omit<O, "queryRef" | "nativeQueryRef">;

export function project<const F extends Expression>(field: F): BaseProjection<F>;
export function project<const F extends Expression, const O extends ProjectionOptions>(
	field: F,
	options: O,
): Projection<F, O>;
export function project(field: Expression, options: ProjectionOptions = {}): unknown {
	const { queryRef = queryRefOf(field), nativeQueryRef = nativeQueryRefOf(field), ...rest } = options;
	if (queryRef === undefined)
		throw new Error(`[ERROR] project: cannot derive queryRef for ${JSON.stringify(field)}`);
	if (nativeQueryRef === undefined)
		throw new Error(`[ERROR] project: cannot derive nativeQueryRef for ${JSON.stringify(field)}`);
	return { field, queryRef, nativeQueryRef, ...rest };
}

export const role = <const P extends ReadonlyArray<unknown>>(...projections: P) => ({ projections });

export const asc = <const F extends Expression>(field: F) => ({ field, direction: "Ascending" as const });

export const desc = <const F extends Expression>(field: F) => ({ field, direction: "Descending" as const });

export type SortClause = ReturnType<typeof asc | typeof desc>;

export const sort = <const C extends ReadonlyArray<SortClause>>(...clauses: C) => ({ sort: clauses });

export const defaultSort = <const C extends ReadonlyArray<SortClause>>(...clauses: C) => ({
	sort: clauses,
	isDefaultSort: true as const,
});
