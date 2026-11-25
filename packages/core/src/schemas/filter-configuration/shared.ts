import { Array, Boolean, Finite, Literals, optionalKey, String, Struct } from "effect/Schema";
import type { Constraint } from "effect/Schema";

import { formattingObjects, formattingProperties } from "#schemas/common/formatting.ts";

/**
 * The filter types that all versions share. The type sets what `filter` holds.
 * `Categorical` picks values, `Advanced` uses conditions, `TopN` keeps the top items, and `RelativeDate` uses a moving date range.
 */
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

/** The filter type of a filter card. `VisualTopN` is a Top N filter from a visual. */
export const FilterType = Literals([...FilterTypeValues, "VisualTopN"]);

export type FilterType = typeof FilterType.Type;

/**
 * How a filter came to be.
 * `Auto` comes from a field in the visual. `User` comes from a field the user adds to the filter pane.
 * `Drill`, `Include`, `Exclude` and `Drillthrough` come from those actions.
 */
export const FilterHowCreated = Literals(["Auto", "User", "Drill", "Include", "Exclude", "Drillthrough"]);

export type FilterHowCreated = typeof FilterHowCreated.Type;

/**
 * How the filter pane sorts filters.
 * `Ascending` and `Descending` sort by display name. `Custom` sorts by `ordinal`.
 */
export const FilterSortOrder = Literals(["Ascending", "Descending", "Custom"]);

export type FilterSortOrder = typeof FilterSortOrder.Type;

/** The `general` object of a filter card: `requireSingleSelect` and `isInvertedSelectionMode`. */
export const FilterContainerFormattingObjectsProperties = Struct(
	formattingProperties("requireSingleSelect", "isInvertedSelectionMode"),
);

export type FilterContainerFormattingObjectsProperties =
	typeof FilterContainerFormattingObjectsProperties.Type;

/**
 * The fields of a filter card that all versions share.
 *
 * - `name`: The filter id. It must be unique in the report.
 * - `displayName`: The name that the filter card shows. It defaults to the field name. Only some filter types
 *   use it.
 * - `ordinal`: The place of the filter when `filterSortOrder` is `Custom`.
 * - `restatement`: The text that the card shows for a `Passthrough` filter. Other types make their own.
 * - `howCreated`: How the filter came to be.
 * - `isHiddenInViewMode`: When true, view mode hides the filter card.
 * - `isLockedInViewMode`: When true, viewers cannot change the filter.
 */
export const FilterContainerFields = {
	name: String,
	displayName: optionalKey(String),
	ordinal: optionalKey(Finite),
	restatement: optionalKey(String),
	howCreated: optionalKey(FilterHowCreated),
	isHiddenInViewMode: optionalKey(Boolean),
	isLockedInViewMode: optionalKey(Boolean),
};

/**
 * Builds the filter schemas of one version.
 * Use `categorical`, `advanced` and the other helpers in `pbirkit/expr` to write filters.
 *
 * - `FilterConfig`: The `filterConfig` block of a report, page or visual.
 * - `FilterConfig.filters`: The filter cards.
 * - `FilterConfig.filterSortOrder`: How the filter pane sorts them. `Custom` uses `ordinal`.
 * - `FilterContainer`: One filter card.
 * - `FilterContainer.field`: The field that the filter works on.
 * - `FilterContainer.type`: The filter type. It sets the shape of `filter`.
 * - `FilterContainer.filter`: The filter query, with a `From` and a `Where` clause.
 * - `FilterContainer.objects`: Card formatting, such as `general.requireSingleSelect`.
 * - `FilterContainerFormattingObjects`: The schema of `FilterContainer.objects`.
 */
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
