import { Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { PlatformConfig, PlatformMetadataFields } from "./shared.ts";

export * from "./shared.ts";

export const PlatformMetadata = Struct({
	...PlatformMetadataFields,
	sensitivityLabelId: optionalKey(String),
});

export type PlatformMetadata = typeof PlatformMetadata.Type;

export const Platform = Struct({
	$schema: Literal(SchemaUrl.platform["2.1.0"]),
	metadata: PlatformMetadata,
	config: PlatformConfig,
});

export type Platform = typeof Platform.Type;
