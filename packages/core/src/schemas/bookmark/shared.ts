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
	suspend,
	Union,
	Unknown,
} from "effect/Schema";
import type { Codec, Constraint } from "effect/Schema";

import { VisualType } from "#core/visual-type.ts";

/** A tree of group-on key columns in a filter. */
export interface DecomposedTree<E> {
	readonly left?: DecomposedTree<E>;
	readonly right?: DecomposedTree<E>;
	readonly value?: E;
}

/**
 * The state of a visual group in a bookmark.
 *
 * - `isHidden`: True when the bookmark hides the group.
 * - `children`: The state of child groups, by group name.
 */
export interface VisualContainerGroupState {
	readonly isHidden?: boolean;
	readonly children?: { readonly [name: string]: VisualContainerGroupState };
}

/**
 * What a bookmark applies.
 *
 * - `applyOnlyToTargetVisuals`: When true, the bookmark applies only to `targetVisualNames`.
 * - `targetVisualNames`: The `name` of each visual that the bookmark applies to.
 * - `suppressActiveSection`: When true, the bookmark does not change the current page.
 * - `suppressData`: When true, the bookmark does not change filters, slicers or sorts.
 * - `suppressDisplay`: When true, the bookmark does not change visibility or spotlight.
 */
export const BookmarkOptions = Struct({
	applyOnlyToTargetVisuals: optionalKey(Boolean),
	targetVisualNames: optionalKey(Array(String)),
	suppressActiveSection: optionalKey(Boolean),
	suppressData: optionalKey(Boolean),
	suppressDisplay: optionalKey(Boolean),
});

export type BookmarkOptions = typeof BookmarkOptions.Type;

/** How a filter came to be, as a number in bookmark state. */
export const FilterContainerHowCreated = Literals([0, 1, 2, 3, 4, 5, 6, 7]);

export type FilterContainerHowCreated = typeof FilterContainerHowCreated.Type;

/**
 * How a bookmark shows a visual.
 * `maximize` shows it in focus mode. `spotlight` dims the other visuals. `elevation` raises it. `hidden` hides it.
 */
export const VisualContainerDisplayMode = Literals(["maximize", "spotlight", "elevation", "hidden"]);

export type VisualContainerDisplayMode = typeof VisualContainerDisplayMode.Type;

/**
 * How a bookmark shows a visual.
 *
 * - `mode`: The display mode.
 * - `maximizedOptions`: For `maximize`, the kind of data table to show: `accessible` or `normal`.
 */
export const VisualContainerDisplayState = Struct({
	mode: VisualContainerDisplayMode,
	maximizedOptions: optionalKey(Struct({ dataTable: optionalKey(Literals(["accessible", "normal"])) })),
});

export type VisualContainerDisplayState = typeof VisualContainerDisplayState.Type;

/** The state of a visual group in a bookmark. */
export const VisualContainerGroupState: Codec<VisualContainerGroupState> = Struct({
	isHidden: optionalKey(Boolean),
	children: optionalKey(
		Record(
			String,
			suspend((): Codec<VisualContainerGroupState> => VisualContainerGroupState),
		),
	),
});

/** Maps an index in decomposed identities to a `queryRef`. */
export const IndexValueMap = Record(String, String);

export type IndexValueMap = typeof IndexValueMap.Type;

/** A JSON filter. `filterType` holds its type. */
export const JsonFilter = Struct({ filterType: Unknown });

export type JsonFilter = typeof JsonFilter.Type;

/** Loose filter metadata fields for bookmark versions without typed forms. */
export const UntypedFilterMetadata = {
	FilterLabelIdPair: Unknown,
	FilterExpressionMetadata: Unknown,
};

/**
 * The bookmark fields that all versions share.
 *
 * - `displayName`: The bookmark name that the bookmarks pane shows.
 * - `name`: The bookmark id. It must be unique in the report, and it names the `<name>.bookmark.json` file.
 * - `options`: What the bookmark applies.
 */
export const BookmarkFields = {
	displayName: String,
	name: String,
	options: optionalKey(BookmarkOptions),
};

/**
 * Builds the schema of decomposed identities: the group-on key columns of a filter, and the values on them.
 *
 * - `values`: The filter values on each column.
 * - `columns`: The group-on key columns.
 */
export const decomposedIdentities = <E>(Expression: Codec<E>) => {
	const DecomposedTree: Codec<DecomposedTree<E>> = Struct({
		left: optionalKey(suspend((): Codec<DecomposedTree<E>> => DecomposedTree)),
		right: optionalKey(suspend((): Codec<DecomposedTree<E>> => DecomposedTree)),
		value: optionalKey(Expression),
	});

	return Struct({
		values: Array(Array(Record(String, Array(Expression)))),
		columns: Array(DecomposedTree),
	});
};

/**
 * Builds the filter metadata schemas of one version.
 *
 * - `FilterLabelIdPair`: A display name for one data point, by selector `id`.
 * - `FilterExpressionMetadata`: The fields of a filter and the values it holds on their group-on keys.
 *   One form lists `expressions` and `cachedValueItems`. The other lists `decomposedIdentities` and `valueMap`.
 */
export const filterMetadata = <E, R extends Constraint>(refs: {
	readonly QueryExpressionContainer: Codec<E>;
	readonly DataRepetitionSelector: R;
}) => {
	const FilterLabelIdPair = Struct({
		id: refs.DataRepetitionSelector,
		displayName: String,
	});

	const FilterExpressionMetadata = Union([
		Struct({
			expressions: Array(refs.QueryExpressionContainer),
			cachedValueItems: optionalKey(
				Array(Struct({ identities: Array(refs.DataRepetitionSelector), valueMap: IndexValueMap })),
			),
			jsonFilter: optionalKey(JsonFilter),
		}),
		Struct({
			decomposedIdentities: optionalKey(decomposedIdentities(refs.QueryExpressionContainer)),
			expressions: Array(Unknown),
			valueMap: optionalKey(Array(IndexValueMap)),
			jsonFilter: optionalKey(JsonFilter),
		}),
	]);

	return { FilterLabelIdPair, FilterExpressionMetadata };
};

/**
 * Builds the bookmark state schemas of one version. Desktop captures this state, so copy it from a saved report.
 *
 * - `ExplorationState`: The whole state of a bookmark.
 * - `ExplorationState.version`: The bookmark state version.
 * - `ExplorationState.activeSection`: The `name` of the page that was open.
 * - `ExplorationState.filters`: The report filters.
 * - `ExplorationState.sections`: The state of each page, by page `name`.
 * - `ExplorationState.objects`: Report formatting changes.
 * - `SectionState`: One page: its filters, and the state of each visual and group, by `name`.
 * - `VisualContainerState`: One visual: its filters, its config state and its highlights.
 * - `SingleVisualConfigState`: Changes to a visual: type, formatting, sort, fields, field parameters and display.
 *   `targetType` changes the visual type, for personalize this visual.
 * - `HighlightState`: The data points of a cross-highlight.
 * - `FiltersState`: Filter cards, keyed `byName`, or listed `byExpr`, `byType` and `byTransientState`.
 * - `FilterContainerState`: One filter card. Its fields mean the same as in `filterConfig`.
 * - `DataViewObjectDefinitionUpdates`: Formatting to `merge`, and properties to `remove`.
 * - `ParameterState`: A field parameter in a query: its field, start index and field count.
 */
export const bookmarkDefinitions = <
	E,
	F extends Constraint,
	O extends Constraint,
	R extends Constraint,
	D extends Constraint,
	L extends Constraint,
	M extends Constraint,
	P extends Struct.Fields,
	S extends Struct.Fields,
>(
	refs: {
		readonly QueryExpressionContainer: Codec<E>;
		readonly FilterDefinition: F;
		readonly QuerySortClause: O;
		readonly DataRepetitionSelector: R;
		readonly DataViewObjectDefinitions: D;
	},
	drift: {
		readonly parameterState: P;
		readonly propertyIdSelector: S;
		readonly FilterLabelIdPair: L;
		readonly FilterExpressionMetadata: M;
	},
) => {
	const Expression = refs.QueryExpressionContainer;

	const FilterContainerState = Struct({
		name: String,
		type: optionalKey(String),
		filter: optionalKey(refs.FilterDefinition),
		expression: optionalKey(Expression),
		restatement: optionalKey(String),
		howCreated: optionalKey(FilterContainerHowCreated),
		precedence: optionalKey(Literal(0)),
		isTransient: optionalKey(Boolean),
		cachedDisplayNames: optionalKey(Array(drift.FilterLabelIdPair)),
		filterExpressionMetadata: optionalKey(drift.FilterExpressionMetadata),
	});

	const FiltersState = Struct({
		byName: optionalKey(Record(String, FilterContainerState)),
		byExpr: optionalKey(Array(FilterContainerState)),
		byType: optionalKey(Array(FilterContainerState)),
		byTransientState: optionalKey(Array(FilterContainerState)),
	});

	const DataViewObjectDefinitionUpdates = Struct({
		merge: optionalKey(refs.DataViewObjectDefinitions),
		remove: optionalKey(Array(Struct({ object: String, property: String, ...drift.propertyIdSelector }))),
	});

	const ProjectionState = Record(String, Array(Expression));

	const ParameterState = Struct({
		expr: Expression,
		index: Finite,
		length: Finite,
		...drift.parameterState,
	});

	const SingleVisualConfigState = Struct({
		visualType: optionalKey(VisualType),
		autoSelectVisualType: optionalKey(Boolean),
		targetType: optionalKey(String),
		targetAutoSelectVisualType: optionalKey(Boolean),
		objects: optionalKey(DataViewObjectDefinitionUpdates),
		orderBy: optionalKey(Array(refs.QuerySortClause)),
		activeProjections: optionalKey(ProjectionState),
		projections: optionalKey(ProjectionState),
		parameters: optionalKey(Record(String, Array(ParameterState))),
		display: optionalKey(VisualContainerDisplayState),
		cachedFilterDisplayItems: optionalKey(Array(drift.FilterLabelIdPair)),
		expansionStates: optionalKey(Array(Unknown)),
		filterExpressionMetadata: optionalKey(drift.FilterExpressionMetadata),
		isDrillDisabled: optionalKey(Boolean),
	});

	const DecomposedSelectors = Struct({
		decomposedIdentities: optionalKey(decomposedIdentities(Expression)),
		queryNameMap: optionalKey(Array(Record(String, Array(Finite)))),
		queryNames: optionalKey(Array(String)),
		metadata: optionalKey(Array(Array(String))),
		id: optionalKey(Array(String)),
	});

	const SelectorsByColumn = Struct({
		dataMap: optionalKey(Record(String, Array(refs.DataRepetitionSelector))),
		metadata: optionalKey(Array(String)),
		id: optionalKey(String),
	});

	const HighlightState = Struct({
		selection: Union([DecomposedSelectors, Array(SelectorsByColumn)]),
		filterExpressionMetadata: optionalKey(drift.FilterExpressionMetadata),
	});

	const VisualContainerState = Struct({
		filters: optionalKey(FiltersState),
		singleVisual: optionalKey(SingleVisualConfigState),
		highlight: optionalKey(HighlightState),
	});

	const SectionState = Struct({
		filters: optionalKey(FiltersState),
		visualContainers: Record(String, VisualContainerState),
		visualContainerGroups: optionalKey(Record(String, VisualContainerGroupState)),
	});

	const ExplorationState = Struct({
		version: String,
		activeSection: String,
		filters: optionalKey(FiltersState),
		sections: Record(String, SectionState),
		objects: optionalKey(DataViewObjectDefinitionUpdates),
		dataSourceVariables: optionalKey(String),
	});

	return {
		FilterContainerState,
		FiltersState,
		DataViewObjectDefinitionUpdates,
		ParameterState,
		SingleVisualConfigState,
		HighlightState,
		VisualContainerState,
		SectionState,
		ExplorationState,
	};
};
