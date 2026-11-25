import { Union } from "effect/Schema";
import { omit } from "effect/Struct";

import { PagesMetadata as PagesMetadataV1_0 } from "./pages/1.0.0.ts";
import { PagesMetadata as PagesMetadataV1_1 } from "./pages/1.1.0.ts";

/**
 * The `pagesMetadata` config input, for any `pages.json` version.
 * It drops `pageOrder`, since the build fills it from the order of `report.pages`.
 */
export const PagesMetadataItem = Union([
	PagesMetadataV1_0.mapFields(omit(["pageOrder"])),
	PagesMetadataV1_1.mapFields(omit(["pageOrder"])),
]);

export type PagesMetadataItem = typeof PagesMetadataItem.Type;
