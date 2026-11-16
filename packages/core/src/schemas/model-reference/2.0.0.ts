import { Boolean, Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

export const ModelReference = Struct({
	$schema: Literal(
		"https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/modelReference/2.0.0/schema.json",
	),
	connectionString: optionalKey(NullOr(String)),
	isMultiDimentional: optionalKey(Boolean),
	connectionType: NullOr(String),
});

export type ModelReference = typeof ModelReference.Type;
