import { Struct, Union } from "effect/Schema";
import { omit } from "effect/Struct";

import { PlatformMetadata as MetadataV2_0, Platform as PlatformV2_0 } from "./platform/2.0.0.ts";
import { PlatformMetadata as MetadataV2_1, Platform as PlatformV2_1 } from "./platform/2.1.0.ts";
import { PlatformConfig } from "./platform/shared.ts";

/**
 * The `platform` config input, for any `.platform` version.
 * It drops `type`, `displayName` and `logicalId`, since the build fills them from the report or model.
 */
export const PlatformItem = Union([
	Struct({
		$schema: PlatformV2_0.fields.$schema,
		...MetadataV2_0.mapFields(omit(["type", "displayName"])).fields,
		...PlatformConfig.mapFields(omit(["logicalId"])).fields,
	}),
	Struct({
		$schema: PlatformV2_1.fields.$schema,
		...MetadataV2_1.mapFields(omit(["type", "displayName"])).fields,
		...PlatformConfig.mapFields(omit(["logicalId"])).fields,
	}),
]);

export type PlatformItem = typeof PlatformItem.Type;

/**
 * Makes the id fields `K` required unless `platform` is a URL to an existing `.platform` file.
 * The build copies that file as it is, or writes a new one from the fields.
 */
export type WithPlatformIds<T extends { readonly platform: unknown }, K extends keyof T> =
	| (T & { readonly platform: URL })
	| (T & { readonly [P in K]-?: NonNullable<T[P]> });
