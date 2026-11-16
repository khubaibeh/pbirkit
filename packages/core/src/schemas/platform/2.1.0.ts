import { Literal, String, Struct, optionalKey } from "effect/Schema";

import { PlatformConfig, PlatformMetadataFields } from "./shared.ts";

export * from "./shared.ts";

export const PlatformMetadata = Struct({
	...PlatformMetadataFields,
	sensitivityLabelId: optionalKey(String),
});

export type PlatformMetadata = typeof PlatformMetadata.Type;

export const Platform = Struct({
	$schema: Literal(
		"https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.1.0/schema.json",
	),
	metadata: PlatformMetadata,
	config: PlatformConfig,
});

export type Platform = typeof Platform.Type;
