import { Boolean, Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

export const ModelReference = Struct({
	$schema: Literal(SchemaUrl.modelReference["2.0.0"]),
	connectionString: optionalKey(NullOr(String)),
	isMultiDimentional: optionalKey(Boolean),
	connectionType: NullOr(String),
});

export type ModelReference = typeof ModelReference.Type;
