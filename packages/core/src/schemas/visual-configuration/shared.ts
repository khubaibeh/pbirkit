import { Array, Boolean, Record, String, Struct, optionalKey } from "effect/Schema";
import type { Codec, Constraint } from "effect/Schema";

import { VisualType } from "#core/visual-type.ts";
import { formattingObjects } from "#schemas/common/formatting.ts";

import { expansionState } from "./expansion.ts";
import { VisualContainerFormattingProperties } from "./formatting.ts";
import { projectionStateFields, queryFields, roleFieldParameterFields } from "./query.ts";

export * from "./expansion.ts";
export * from "./formatting.ts";
export * from "./query.ts";

/**
 * Keeps slicers on other pages in step. It applies only to slicers.
 *
 * - `groupName`: The group name. Slicers with the same name stay in step.
 * - `fieldChanges`: When true, a field change in one slicer reaches the others.
 * - `filterChanges`: When true, a selection in one slicer reaches the others.
 */
export const VisualSyncGroup = Struct({
	groupName: String,
	fieldChanges: optionalKey(Boolean),
	filterChanges: optionalKey(Boolean),
});

export type VisualSyncGroup = typeof VisualSyncGroup.Type;

/**
 * The fields of `visual` that all versions share.
 *
 * - `visualType`: The visual type, such as `cardVisual` or `lineChart`. Run `pbirkit visual` to list them.
 * - `autoSelectVisualType`: When true, Power BI picks the type from the data.
 * - `syncGroup`: The slicer sync group. It applies only to slicers.
 * - `drillFilterOtherVisuals`: When true, a drill in a visual that interacts with this one filters this one.
 *   It beats the report setting.
 */
export const VisualConfigurationFields = {
	visualType: VisualType,
	autoSelectVisualType: optionalKey(Boolean),
	syncGroup: optionalKey(VisualSyncGroup),
	drillFilterOtherVisuals: optionalKey(Boolean),
};

/**
 * Builds the `visual` schemas of one version from its query, selector and object schemas.
 * `drift` adds the fields that changed in that version.
 *
 * - `VisualConfiguration`: The `visual` block of `visual.json`.
 * - `VisualConfiguration.query`: The data of the visual: `queryState` maps each role name to its fields.
 * - `VisualConfiguration.expansionStates`: Which values a hierarchy visual expands.
 * - `VisualConfiguration.objects`: Chart formatting. Names come from the visual type.
 * - `VisualConfiguration.visualContainerObjects`: Frame formatting, such as `title` and `border`.
 * - `Query`: Sort, options and `queryState`.
 * - `ProjectionState`: One role: its fields and its field parameters.
 * - `RoleFieldParameter`: A field parameter in a role.
 * - `ExpansionState`: One expansion state.
 * - `VisualContainerFormattingObjects`: The schema of `visualContainerObjects`.
 */
export const visualConfiguration = <
	E,
	S extends Constraint,
	O extends Constraint,
	R extends Struct.Fields,
	P extends Struct.Fields,
>(
	refs: {
		readonly QueryExpressionContainer: Codec<E>;
		readonly Selector: S;
		readonly DataViewObjectDefinitions: O;
	},
	drift: {
		readonly roleFieldParameter: R;
		readonly formatting: P;
	},
) => {
	const Expression = refs.QueryExpressionContainer;

	const RoleFieldParameter = Struct({ ...roleFieldParameterFields(Expression), ...drift.roleFieldParameter });

	const ProjectionState = Struct({
		...projectionStateFields(Expression),
		fieldParameters: optionalKey(Array(RoleFieldParameter)),
	});

	const Query = Struct({
		...queryFields(Expression),
		queryState: Record(String, ProjectionState),
	});

	const ExpansionState = expansionState(Expression);

	const VisualContainerFormattingObjects = formattingObjects(refs.Selector, {
		...VisualContainerFormattingProperties,
		...drift.formatting,
	});

	const VisualConfiguration = Struct({
		...VisualConfigurationFields,
		query: optionalKey(Query),
		expansionStates: optionalKey(Array(ExpansionState)),
		objects: optionalKey(refs.DataViewObjectDefinitions),
		visualContainerObjects: optionalKey(VisualContainerFormattingObjects),
	});

	return {
		RoleFieldParameter,
		ProjectionState,
		Query,
		ExpansionState,
		VisualContainerFormattingObjects,
		VisualConfiguration,
	};
};
