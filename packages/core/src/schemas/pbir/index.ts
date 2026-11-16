import { Union } from "effect/Schema";
import { omit } from "effect/Struct";

import { Pbir as PbirV1_0 } from "./1.0.0.ts";
import { Pbir as PbirV2_0 } from "./2.0.0.ts";

export const PbirItem = Union([
	PbirV1_0.mapFields(omit(["datasetReference"])),
	PbirV2_0.mapFields(omit(["datasetReference"])),
]);

export type PbirItem = typeof PbirItem.Type;
