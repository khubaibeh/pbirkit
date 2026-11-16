import { Literal, String, Struct } from "effect/Schema";

export const VersionMetadata = Struct({
	$schema: Literal(
		"https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
	),
	version: String,
});

export type VersionMetadata = typeof VersionMetadata.Type;
