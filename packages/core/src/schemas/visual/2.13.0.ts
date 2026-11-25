import { Literal, Struct, Union, optionalKey } from "effect/Schema";

import type { CheckedVisual } from "#core/visual-catalog/types.ts";
import type { WithoutSchema } from "#schemas/common/define.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.3.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { VisualConfiguration } from "#schemas/visual-configuration/2.8.0.ts";

import { HowCreated } from "./1.1.0.ts";
import { VisualContainerPosition } from "./1.2.0.ts";
import { VisualGroupConfig } from "./2.7.0.ts";
import { VisualContainerFields } from "./shared.ts";

export * from "./shared.ts";
export { FilterConfig, HowCreated, VisualConfiguration, VisualContainerPosition, VisualGroupConfig };

const fields = {
	$schema: Literal(SchemaUrl.visual["2.13.0"]),
	...VisualContainerFields,
	position: VisualContainerPosition,
	filterConfig: optionalKey(FilterConfig),
	howCreated: optionalKey(HowCreated),
};

/**
 * The `visual.json` file of one visual or group.
 * Set `visual` for a chart, or `visualGroup` for a group, never both.
 *
 * - `position`: Where the visual sits and how big it is.
 * - `filterConfig`: Filters on this visual, on top of the page and report filters.
 * - `howCreated`: How the visual came to be. Desktop writes it.
 * - `visual`: The chart: its type, query, formatting and more.
 * - `visualGroup`: The group settings, for a group.
 */
export const Visual = Union([
	Struct({ ...fields, visual: VisualConfiguration }),
	Struct({ ...fields, visualGroup: VisualGroupConfig }),
]);

export type Visual = typeof Visual.Type;

/**
 * Builds a 2.13.0 visual and fills `$schema`.
 * It checks `visualType`, object names, property names and role names against the visual catalog.
 * Pass no type parameters. TS infers them from the call. See `docs/authoring.md`.
 */
export const defineVisual = <Type extends string, const Objects, QueryState>(
	visual: CheckedVisual<WithoutSchema<Visual>, Type, Objects, QueryState>,
): Visual => ({
	$schema: fields.$schema.literal,
	...visual,
});
