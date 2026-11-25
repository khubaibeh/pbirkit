import { Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { PlatformConfig, PlatformMetadataFields } from "./shared.ts";

export * from "./shared.ts";

/**
 * - `sensitivityLabelId`: The id of the sensitivity label on the item.
 */
export const PlatformMetadata = Struct({
	...PlatformMetadataFields,
	sensitivityLabelId: optionalKey(String),
});

export type PlatformMetadata = typeof PlatformMetadata.Type;

/** The `.platform` file in a `.Report` or `.SemanticModel` folder. Fabric git sync reads it. */
export const Platform = Struct({
	$schema: Literal(SchemaUrl.platform["2.1.0"]),
	metadata: PlatformMetadata,
	config: PlatformConfig,
});

export type Platform = typeof Platform.Type;
