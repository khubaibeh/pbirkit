import { Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { ByPath } from "./shared.ts";

export * from "./shared.ts";

/**
 * Binds the report to a model in the Fabric service, for a live connection.
 * An Analysis Services model needs `byPath` to a model folder with `modelReference.json` instead.
 *
 * - `connectionString`: The connection string of the remote model.
 */
export const ByConnection = Struct({
	connectionString: String,
});

export type ByConnection = typeof ByConnection.Type;

/** The model that the report uses. Set exactly one of `byPath` and `byConnection`. */
export const DatasetReference = Struct({
	byPath: optionalKey(NullOr(ByPath)),
	byConnection: optionalKey(NullOr(ByConnection)),
});

export type DatasetReference = typeof DatasetReference.Type;

/**
 * The `definition.pbir` file in the `.Report` folder. Desktop requires it.
 *
 * - `version`: The version of the `.pbir` file format, such as `"4.0"`.
 */
export const Pbir = Struct({
	$schema: optionalKey(Literal(SchemaUrl.pbir["2.0.0"])),
	version: String,
	datasetReference: DatasetReference,
});

export type Pbir = typeof Pbir.Type;
