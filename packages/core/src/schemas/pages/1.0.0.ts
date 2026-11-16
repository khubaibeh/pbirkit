import { Literal, Struct } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { PagesMetadataFields } from "./shared.ts";

export * from "./shared.ts";

export const PagesMetadata = Struct({
	$schema: Literal(SchemaUrl.pages["1.0.0"]),
	...PagesMetadataFields,
});

export type PagesMetadata = typeof PagesMetadata.Type;
