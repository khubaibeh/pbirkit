import { Struct, Union, optionalKey } from "effect/Schema";
import { omit } from "effect/Struct";

import { ByConnection as ByConnectionV1_0, Pbir as PbirV1_0 } from "./pbir/1.0.0.ts";
import { ByConnection as ByConnectionV2_0, Pbir as PbirV2_0 } from "./pbir/2.0.0.ts";

export const PbirItem = Union([
	Struct({
		...PbirV1_0.mapFields(omit(["datasetReference"])).fields,
		datasetReference: optionalKey(Struct({ byConnection: ByConnectionV1_0 })),
	}),
	Struct({
		...PbirV2_0.mapFields(omit(["datasetReference"])).fields,
		datasetReference: optionalKey(Struct({ byConnection: ByConnectionV2_0 })),
	}),
]);

export type PbirItem = typeof PbirItem.Type;
