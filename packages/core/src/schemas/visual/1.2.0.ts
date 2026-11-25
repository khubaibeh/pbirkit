import { Finite, Literal, optionalKey, Struct, Union } from "effect/Schema";

import type { CheckedVisual } from "#core/visual-catalog/types.ts";
import type { WithoutSchema } from "#schemas/common/define.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.0.0.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.2.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { VisualConfiguration } from "#schemas/visual-configuration/1.5.0.ts";

import { HowCreated } from "./1.1.0.ts";
import { PositionFields, VisualContainerFields, visualGroupConfig } from "./shared.ts";

export * from "./shared.ts";
export { FilterConfig, HowCreated, VisualConfiguration };

/** A visual group. It holds visuals whose `parentGroupName` is the group `name`. */
export const VisualGroupConfig = visualGroupConfig(Selector);

export type VisualGroupConfig = typeof VisualGroupConfig.Type;

/**
 * Where the visual sits on the page and how big it is, in page pixels.
 *
 * - `angle`: The rotation angle.
 */
export const VisualContainerPosition = Struct({
	...PositionFields,
	angle: optionalKey(Finite),
});

export type VisualContainerPosition = typeof VisualContainerPosition.Type;

const fields = {
	$schema: Literal(SchemaUrl.visual["1.2.0"]),
	...VisualContainerFields,
	position: VisualContainerPosition,
	filterConfig: optionalKey(FilterConfig),
	howCreated: optionalKey(HowCreated),
};

export const Visual = Union([
	Struct({ ...fields, visual: VisualConfiguration }),
	Struct({ ...fields, visualGroup: VisualGroupConfig }),
]);

export type Visual = typeof Visual.Type;

export const defineVisual = <Type extends string, const Objects, QueryState>(
	visual: CheckedVisual<WithoutSchema<Visual>, Type, Objects, QueryState>,
): Visual => ({
	$schema: fields.$schema.literal,
	...visual,
});
