import { Union } from "effect/Schema";

import { PageDefinition as PageV1_0 } from "./1.0.0.ts";
import { PageDefinition as PageV1_1 } from "./1.1.0.ts";
import { PageDefinition as PageV1_2 } from "./1.2.0.ts";
import { PageDefinition as PageV1_3 } from "./1.3.0.ts";
import { PageDefinition as PageV1_4 } from "./1.4.0.ts";
import { PageDefinition as PageV2_0 } from "./2.0.0.ts";
import { PageDefinition as PageV2_1 } from "./2.1.0.ts";

export const AnyPage = Union([PageV1_0, PageV1_1, PageV1_2, PageV1_3, PageV1_4, PageV2_0, PageV2_1]);

export type AnyPage = typeof AnyPage.Type;
