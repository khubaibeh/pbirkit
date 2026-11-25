import { Union } from "effect/Schema";

import { Visual as VisualV1_0 } from "./visual/1.0.0.ts";
import { Visual as VisualV1_1 } from "./visual/1.1.0.ts";
import { Visual as VisualV1_2 } from "./visual/1.2.0.ts";
import { Visual as VisualV1_3 } from "./visual/1.3.0.ts";
import { Visual as VisualV1_4 } from "./visual/1.4.0.ts";
import { Visual as VisualV1_5 } from "./visual/1.5.0.ts";
import { Visual as VisualV1_6 } from "./visual/1.6.0.ts";
import { Visual as VisualV1_7 } from "./visual/1.7.0.ts";
import { Visual as VisualV1_8 } from "./visual/1.8.0.ts";
import { Visual as VisualV2_0 } from "./visual/2.0.0.ts";
import { Visual as VisualV2_1 } from "./visual/2.1.0.ts";
import { Visual as VisualV2_2 } from "./visual/2.2.0.ts";
import { Visual as VisualV2_3 } from "./visual/2.3.0.ts";
import { Visual as VisualV2_4 } from "./visual/2.4.0.ts";
import { Visual as VisualV2_5 } from "./visual/2.5.0.ts";
import { Visual as VisualV2_6 } from "./visual/2.6.0.ts";
import { Visual as VisualV2_7 } from "./visual/2.7.0.ts";
import { Visual as VisualV2_8 } from "./visual/2.8.0.ts";
import { Visual as VisualV2_9 } from "./visual/2.9.0.ts";
import { Visual as VisualV2_10 } from "./visual/2.10.0.ts";
import { Visual as VisualV2_11 } from "./visual/2.11.0.ts";
import { Visual as VisualV2_12 } from "./visual/2.12.0.ts";
import { Visual as VisualV2_13 } from "./visual/2.13.0.ts";

/** A `visual.json` of any supported version. `$schema` picks the version. */
export const AnyVisual = Union([
	VisualV1_0,
	VisualV1_1,
	VisualV1_2,
	VisualV1_3,
	VisualV1_4,
	VisualV1_5,
	VisualV1_6,
	VisualV1_7,
	VisualV1_8,
	VisualV2_0,
	VisualV2_1,
	VisualV2_2,
	VisualV2_3,
	VisualV2_4,
	VisualV2_5,
	VisualV2_6,
	VisualV2_7,
	VisualV2_8,
	VisualV2_9,
	VisualV2_10,
	VisualV2_11,
	VisualV2_12,
	VisualV2_13,
]);

export type AnyVisual = typeof AnyVisual.Type;
