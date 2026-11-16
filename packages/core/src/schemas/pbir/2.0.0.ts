import { Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

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
	$schema: optionalKey(
		Literal(
			"https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
		),
	),
	version: String,
	datasetReference: DatasetReference,
});

export type Pbir = typeof Pbir.Type;
