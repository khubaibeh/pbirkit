import { Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { PagesMetadataFields } from "./shared.ts";

export * from "./shared.ts";

/**
 * The `definition/pages/pages.json` file.
 *
 * - `landingPageName`: The page that the report always opens on, for all users. It beats `activePageName`.
 *   Use the page `name`, not the display name.
 */
export const PagesMetadata = Struct({
	$schema: Literal(SchemaUrl.pages["1.1.0"]),
	...PagesMetadataFields,
	landingPageName: optionalKey(String),
});

export type PagesMetadata = typeof PagesMetadata.Type;
