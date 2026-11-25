import { Literal, String, Struct } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

/**
 * The `definition/version.json` file of a report.
 *
 * - `version`: The report definition version as `major.minor.patch`. Major is 1 or more, and patch is always
 *   0.
 */
export const VersionMetadata = Struct({
	$schema: Literal(SchemaUrl.version["1.0.0"]),
	version: String,
});

export type VersionMetadata = typeof VersionMetadata.Type;
