import { Literal, String, Struct } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

export const VersionMetadata = Struct({
	$schema: Literal(SchemaUrl.version["1.0.0"]),
	version: String,
});

export type VersionMetadata = typeof VersionMetadata.Type;
