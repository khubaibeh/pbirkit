import { Boolean, Literal, Literals, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

export const PbismSettings = Struct({
	qnaEnabled: optionalKey(NullOr(Boolean)),
	qnaLsdlSharingPermissions: optionalKey(Literals([0, 1])),
});

export type PbismSettings = typeof PbismSettings.Type;

export const Pbism = Struct({
	$schema: optionalKey(Literal(SchemaUrl.pbism["1.0.0"])),
	version: String,
	settings: optionalKey(NullOr(PbismSettings)),
});

export type Pbism = typeof Pbism.Type;
