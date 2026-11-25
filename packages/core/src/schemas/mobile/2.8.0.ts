import { Literal, Struct, optionalKey } from "effect/Schema";

import { DataViewObjectDefinitions } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { VisualContainerFormattingObjects } from "#schemas/visual-configuration/2.8.0.ts";
import { VisualContainerPosition } from "#schemas/visual/1.2.0.ts";

export { VisualContainerFormattingObjects, VisualContainerPosition };

/**
 * The `mobile.json` file next to a `visual.json`. It holds the layout and formatting of the visual in the mobile view.
 *
 * - `position`: Where the visual sits on the mobile page.
 * - `objects`: Chart formatting that applies only on mobile.
 * - `visualContainerObjects`: Frame formatting that applies only on mobile.
 */
export const MobileState = Struct({
	$schema: Literal(SchemaUrl.mobile["2.8.0"]),
	objects: optionalKey(DataViewObjectDefinitions),
	visualContainerObjects: optionalKey(VisualContainerFormattingObjects),
	position: VisualContainerPosition,
});

export type MobileState = typeof MobileState.Type;
