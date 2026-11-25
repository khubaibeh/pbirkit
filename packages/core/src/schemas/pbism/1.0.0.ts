import { Boolean, Literal, Literals, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

/**
 * Model settings for other Power BI features. They do not change how the model itself works.
 *
 * - `qnaEnabled`: When true, Q&A works on this model.
 * - `qnaLsdlSharingPermissions`: Who in the tenant can see the Q&A language schema (LSDL). `0` means users
 *   with read access. `1` means all users.
 */
export const PbismSettings = Struct({
	qnaEnabled: optionalKey(NullOr(Boolean)),
	qnaLsdlSharingPermissions: optionalKey(Literals([0, 1])),
});

export type PbismSettings = typeof PbismSettings.Type;

/**
 * The `definition.pbism` file in the `.SemanticModel` folder. Desktop requires it.
 *
 * - `version`: The version of the `.pbism` file format, such as `"4.2"`.
 */
export const Pbism = Struct({
	$schema: optionalKey(Literal(SchemaUrl.pbism["1.0.0"])),
	version: String,
	settings: optionalKey(NullOr(PbismSettings)),
});

export type Pbism = typeof Pbism.Type;
