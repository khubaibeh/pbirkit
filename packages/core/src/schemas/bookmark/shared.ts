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

export interface DecomposedTree<E> {
	readonly left?: DecomposedTree<E>;
	readonly right?: DecomposedTree<E>;
	readonly value?: E;
}

export interface VisualContainerGroupState {
	readonly isHidden?: boolean;
	readonly children?: { readonly [name: string]: VisualContainerGroupState };
}

export const BookmarkOptions = Struct({
	applyOnlyToTargetVisuals: optionalKey(Boolean),
	targetVisualNames: optionalKey(Array(String)),
	suppressActiveSection: optionalKey(Boolean),
	suppressData: optionalKey(Boolean),
	suppressDisplay: optionalKey(Boolean),
});

export type BookmarkOptions = typeof BookmarkOptions.Type;

export const FilterContainerHowCreated = Literals([0, 1, 2, 3, 4, 5, 6, 7]);

export type FilterContainerHowCreated = typeof FilterContainerHowCreated.Type;

export const VisualContainerDisplayMode = Literals(["maximize", "spotlight", "elevation", "hidden"]);

export type VisualContainerDisplayMode = typeof VisualContainerDisplayMode.Type;

export const VisualContainerDisplayState = Struct({
	mode: VisualContainerDisplayMode,
	maximizedOptions: optionalKey(Struct({ dataTable: optionalKey(Literals(["accessible", "normal"])) })),
});

export type VisualContainerDisplayState = typeof VisualContainerDisplayState.Type;

export const VisualContainerGroupState: Codec<VisualContainerGroupState> = Struct({
	isHidden: optionalKey(Boolean),
	children: optionalKey(
		Record(
			String,
			suspend((): Codec<VisualContainerGroupState> => VisualContainerGroupState),
		),
	),
});

export const IndexValueMap = Record(String, String);

export type IndexValueMap = typeof IndexValueMap.Type;

export const JsonFilter = Struct({ filterType: Unknown });

export type JsonFilter = typeof JsonFilter.Type;

export const UntypedFilterMetadata = {
	FilterLabelIdPair: Unknown,
	FilterExpressionMetadata: Unknown,
};

export const BookmarkFields = {
	displayName: String,
	name: String,
	options: optionalKey(BookmarkOptions),
};

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
