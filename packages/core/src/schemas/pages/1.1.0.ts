import { Literal, String, Struct, optionalKey } from "effect/Schema";

import { PagesMetadataFields } from "./shared.ts";

export * from "./shared.ts";

export const PagesMetadata = Struct({
	$schema: Literal(
		"https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json",
	),
	...PagesMetadataFields,
	landingPageName: optionalKey(String),
});

export type PagesMetadata = typeof PagesMetadata.Type;
