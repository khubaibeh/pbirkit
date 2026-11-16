import { Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

import { ByPath } from "./shared.ts";

export * from "./shared.ts";

export const ByConnection = Struct({
	connectionString: String,
});

export type ByConnection = typeof ByConnection.Type;

export const DatasetReference = Struct({
	byPath: optionalKey(NullOr(ByPath)),
	byConnection: optionalKey(NullOr(ByConnection)),
});

export type DatasetReference = typeof DatasetReference.Type;

export const Pbir = Struct({
	$schema: optionalKey(Literal(SchemaUrl.pbir["2.0.0"])),
	version: String,
	datasetReference: DatasetReference,
});

export type Pbir = typeof Pbir.Type;
