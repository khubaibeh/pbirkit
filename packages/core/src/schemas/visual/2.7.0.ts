import { Literal, Struct, Union, optionalKey } from "effect/Schema";

import type { CheckedVisual } from "#core/visual-catalog/types.ts";
import type { WithoutSchema } from "#schemas/common/define.ts";
import { FilterConfig } from "#schemas/filter-configuration/1.3.0.ts";
import { Selector } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { VisualConfiguration } from "#schemas/visual-configuration/2.3.0.ts";

import { HowCreated } from "./1.1.0.ts";
import { VisualContainerPosition } from "./1.2.0.ts";
import { VisualContainerFields, visualGroupConfig } from "./shared.ts";

export * from "./shared.ts";
export { FilterConfig, HowCreated, VisualConfiguration, VisualContainerPosition };

export const VisualGroupConfig = visualGroupConfig(Selector);

export type VisualGroupConfig = typeof VisualGroupConfig.Type;

const fields = {
	$schema: Literal(SchemaUrl.visual["2.7.0"]),
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

export const defineVisual = <T extends string, const O, S>(
	visual: CheckedVisual<WithoutSchema<Visual>, T, O, S>,
): Visual => ({
	$schema: fields.$schema.literal,
	...visual,
});
