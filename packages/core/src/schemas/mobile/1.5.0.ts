import { Literal, Struct, optionalKey } from "effect/Schema";

import { DataViewObjectDefinitions } from "#schemas/formatting-object-definitions/1.3.0.ts";
import { VisualContainerFormattingObjects } from "#schemas/visual-configuration/1.8.0.ts";
import { VisualContainerPosition } from "#schemas/visual/1.2.0.ts";

export { VisualContainerFormattingObjects, VisualContainerPosition };

export const MobileState = Struct({
	$schema: Literal(
		"https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainerMobileState/1.5.0/schema.json",
	),
	objects: optionalKey(DataViewObjectDefinitions),
	visualContainerObjects: optionalKey(VisualContainerFormattingObjects),
	position: VisualContainerPosition,
});

export type MobileState = typeof MobileState.Type;
