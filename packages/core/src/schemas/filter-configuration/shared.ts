import { Array, Boolean, Finite, Literals, optionalKey, String, Struct } from "effect/Schema";
import type { Constraint } from "effect/Schema";

import { formattingObjects, formattingProperties } from "#schemas/common/formatting.ts";

export const FilterTypeValues = [
	"Categorical",
	"Range",
	"Advanced",
	"Passthrough",
	"TopN",
	"Include",
	"Exclude",
	"RelativeDate",
	"Tuple",
	"RelativeTime",
] as const;

export const FilterType = Literals([...FilterTypeValues, "VisualTopN"]);

export type FilterType = typeof FilterType.Type;

export const FilterHowCreated = Literals(["Auto", "User", "Drill", "Include", "Exclude", "Drillthrough"]);

export type FilterHowCreated = typeof FilterHowCreated.Type;

export const FilterSortOrder = Literals(["Ascending", "Descending", "Custom"]);

export type FilterSortOrder = typeof FilterSortOrder.Type;

export const FilterContainerFormattingObjectsProperties = Struct(
	formattingProperties("requireSingleSelect", "isInvertedSelectionMode"),
);

export type FilterContainerFormattingObjectsProperties =
	typeof FilterContainerFormattingObjectsProperties.Type;

export const FilterContainerFields = {
	name: String,
	displayName: optionalKey(String),
	ordinal: optionalKey(Finite),
	restatement: optionalKey(String),
	howCreated: optionalKey(FilterHowCreated),
	isHiddenInViewMode: optionalKey(Boolean),
	isLockedInViewMode: optionalKey(Boolean),
};

export const filterConfiguration = <
	E extends Constraint,
	F extends Constraint,
	S extends Constraint,
	T extends Constraint,
>(refs: {
	readonly QueryExpressionContainer: E;
	readonly FilterDefinition: F;
	readonly Selector: S;
	readonly FilterType: T;
}) => {
	const FilterContainerFormattingObjects = formattingObjects(refs.Selector, {
		general: FilterContainerFormattingObjectsProperties,
	});

	const FilterContainer = Struct({
		...FilterContainerFields,
		field: optionalKey(refs.QueryExpressionContainer),
		type: optionalKey(refs.FilterType),
		filter: optionalKey(refs.FilterDefinition),
		objects: optionalKey(FilterContainerFormattingObjects),
	});

	const FilterConfig = Struct({
		filters: optionalKey(Array(FilterContainer)),
		filterSortOrder: optionalKey(FilterSortOrder),
	});

	return { FilterContainerFormattingObjects, FilterContainer, FilterConfig };
};
