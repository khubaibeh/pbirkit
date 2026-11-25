import { Struct, Union } from "effect/Schema";

import { RawItem } from "#schemas/common/raw.ts";

import { PageDefinition as PageV1_0, Page as PageFileV1_0 } from "./page/1.0.0.ts";
import { PageDefinition as PageV1_1, Page as PageFileV1_1 } from "./page/1.1.0.ts";
import { PageDefinition as PageV1_2, Page as PageFileV1_2 } from "./page/1.2.0.ts";
import { PageDefinition as PageV1_3, Page as PageFileV1_3 } from "./page/1.3.0.ts";
import { PageDefinition as PageV1_4, Page as PageFileV1_4 } from "./page/1.4.0.ts";
import { PageDefinition as PageV2_0, Page as PageFileV2_0 } from "./page/2.0.0.ts";
import { PageDefinition as PageV2_1, Page as PageFileV2_1 } from "./page/2.1.0.ts";
import { PageVisuals } from "./page/shared.ts";

/** A page of any supported version in config input, with its visuals. `$schema` picks the version. */
export const AnyPage = Union([PageV1_0, PageV1_1, PageV1_2, PageV1_3, PageV1_4, PageV2_0, PageV2_1]);

export type AnyPage = typeof AnyPage.Type;

/** A `page.json` file of any supported version, without visuals. */
export const AnyPageFile = Union([
	PageFileV1_0,
	PageFileV1_1,
	PageFileV1_2,
	PageFileV1_3,
	PageFileV1_4,
	PageFileV2_0,
	PageFileV2_1,
]);

export type AnyPageFile = typeof AnyPageFile.Type;

/** A page that copies an existing `page.json` from `file`, plus its visuals. */
export const RawPage = Struct({ ...RawItem.fields, visuals: PageVisuals });

export type RawPage = typeof RawPage.Type;
