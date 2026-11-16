import { Literals, String, Struct, optionalKey } from "effect/Schema";

export const PlatformMetadataFields = {
	type: Literals(["Report", "SemanticModel"]),
	displayName: String,
	description: optionalKey(String),
};

export const PlatformConfig = Struct({
	version: String,
	logicalId: String,
});

export type PlatformConfig = typeof PlatformConfig.Type;
