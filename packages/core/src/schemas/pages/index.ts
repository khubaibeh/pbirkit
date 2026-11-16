import { Union } from "effect/Schema";
import { omit } from "effect/Struct";

import { PagesMetadata as PagesMetadataV1_0 } from "./1.0.0.ts";
import { PagesMetadata as PagesMetadataV1_1 } from "./1.1.0.ts";

export const PagesMetadataItem = Union([
	PagesMetadataV1_0.mapFields(omit(["pageOrder"])),
	PagesMetadataV1_1.mapFields(omit(["pageOrder"])),
]);

export type PagesMetadataItem = typeof PagesMetadataItem.Type;
