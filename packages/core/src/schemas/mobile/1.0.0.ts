import { Literal, Struct, optionalKey } from "effect/Schema";

import { DataViewObjectDefinitions } from "#schemas/formatting-object-definitions/1.0.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { VisualContainerPosition } from "#schemas/visual/1.0.0.ts";
import { VisualContainerFormattingObjects } from "#schemas/visual/1.0.0.ts";

export { VisualContainerFormattingObjects, VisualContainerPosition };

export const MobileState = Struct({
	$schema: Literal(SchemaUrl.mobile["1.0.0"]),
	objects: optionalKey(DataViewObjectDefinitions),
	visualContainerObjects: optionalKey(VisualContainerFormattingObjects),
	position: VisualContainerPosition,
});

export type MobileState = typeof MobileState.Type;
