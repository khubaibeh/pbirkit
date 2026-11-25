import { Literals, String, Struct, optionalKey } from "effect/Schema";

/**
 * The `metadata` fields of a `.platform` file that all versions share.
 *
 * - `type`: The kind of Fabric item in the folder.
 * - `displayName`: The item name that Fabric and Desktop show.
 */
export const PlatformMetadataFields = {
	type: Literals(["Report", "SemanticModel"]),
	displayName: String,
	description: optionalKey(String),
};

/**
 * The `config` block of a `.platform` file.
 *
 * - `version`: The version of the metadata, such as `"2.0"`.
 * - `logicalId`: The stable id of the item. Fabric git sync uses it to match the folder to the item. Keep it
 *   fixed.
 */
export const PlatformConfig = Struct({
	version: String,
	logicalId: String,
});

export type PlatformConfig = typeof PlatformConfig.Type;
