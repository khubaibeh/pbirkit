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

export const VisualSyncGroup = Struct({
	groupName: String,
	fieldChanges: optionalKey(Boolean),
	filterChanges: optionalKey(Boolean),
});

export type VisualSyncGroup = typeof VisualSyncGroup.Type;

export const VisualConfigurationFields = {
	visualType: VisualType,
	autoSelectVisualType: optionalKey(Boolean),
	syncGroup: optionalKey(VisualSyncGroup),
	drillFilterOtherVisuals: optionalKey(Boolean),
};

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
