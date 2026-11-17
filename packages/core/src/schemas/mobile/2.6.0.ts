import { Literal, Struct, optionalKey } from "effect/Schema";

import { DataViewObjectDefinitions } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { VisualContainerFormattingObjects } from "#schemas/visual-configuration/2.6.0.ts";
import { VisualContainerPosition } from "#schemas/visual/1.2.0.ts";

export { VisualContainerFormattingObjects, VisualContainerPosition };

export const MobileState = Struct({
	$schema: Literal(SchemaUrl.mobile["2.6.0"]),
	objects: optionalKey(DataViewObjectDefinitions),
	visualContainerObjects: optionalKey(VisualContainerFormattingObjects),
	position: VisualContainerPosition,
});

export type MobileState = typeof MobileState.Type;
