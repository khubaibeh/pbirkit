import { Boolean, Literal, Literals, NullOr, String, Struct, optionalKey } from "effect/Schema";

export const PbismSettings = Struct({
	qnaEnabled: optionalKey(NullOr(Boolean)),
	qnaLsdlSharingPermissions: optionalKey(Literals([0, 1])),
});

export type PbismSettings = typeof PbismSettings.Type;

export const Pbism = Struct({
	$schema: optionalKey(
		Literal(
			"https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
		),
	),
	version: String,
	settings: optionalKey(NullOr(PbismSettings)),
});

export type Pbism = typeof Pbism.Type;
