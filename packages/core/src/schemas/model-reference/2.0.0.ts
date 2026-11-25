import { Boolean, Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

/**
 * The `modelReference.json` file. It points at a model that lives outside Power BI, such as Analysis Services.
 * A report reaches such a model through `datasetReference.byPath`, not `byConnection`.
 *
 * - `connectionString`: The Analysis Services connection string for the model.
 * - `isMultiDimentional`: True for a multidimensional cube. False for a tabular model. Microsoft spells the
 *   key this way.
 * - `connectionType`: The kind of connection to the outside model.
 */
export const ModelReference = Struct({
	$schema: Literal(SchemaUrl.modelReference["2.0.0"]),
	connectionString: optionalKey(NullOr(String)),
	isMultiDimentional: optionalKey(Boolean),
	connectionType: NullOr(String),
});

export type ModelReference = typeof ModelReference.Type;
