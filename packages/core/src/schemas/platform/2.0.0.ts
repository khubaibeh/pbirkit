import { Literal, Struct } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { PlatformConfig, PlatformMetadataFields } from "./shared.ts";

export * from "./shared.ts";

export const PlatformMetadata = Struct(PlatformMetadataFields);

export type PlatformMetadata = typeof PlatformMetadata.Type;

export const Platform = Struct({
	$schema: Literal(SchemaUrl.platform["2.0.0"]),
	metadata: PlatformMetadata,
	config: PlatformConfig,
});

export type Platform = typeof Platform.Type;
