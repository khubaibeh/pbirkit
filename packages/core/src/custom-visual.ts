import {
	Literal,
	Literals,
	Record,
	String,
	Struct,
	StructWithRest,
	Unknown,
	optionalKey,
} from "effect/Schema";

export const CustomVisualSource = Literals(["appSource", "file", "organization"]);

export type CustomVisualSource = typeof CustomVisualSource.Type;

export const PbivizVisual = StructWithRest(
	Struct({
		guid: String,
		name: String,
		displayName: String,
		version: String,
		description: optionalKey(String),
		supportUrl: optionalKey(String),
		gitHubUrl: optionalKey(String),
		visualClassName: String,
	}),
	[Record(String, Unknown)],
);

export type PbivizVisual = typeof PbivizVisual.Type;

export const Pbiviz = StructWithRest(
	Struct({ visual: PbivizVisual, author: optionalKey(Struct({ name: String, email: String })) }),
	[Record(String, Unknown)],
);

export type Pbiviz = typeof Pbiviz.Type;

export const CustomVisualResource = Struct({
	kind: Literal("customVisual"),
	guid: String,
	source: Literal("file"),
	pbiviz: optionalKey(Pbiviz),
});

export type CustomVisualResource = typeof CustomVisualResource.Type;

export interface CustomVisual<G extends string, S extends CustomVisualSource> {
	readonly kind: "customVisual";
	readonly guid: G;
	readonly source: S;
	readonly pbiviz?: S extends "file" ? Pbiviz : never;
}

export const customVisual = <const G extends string, const S extends CustomVisualSource>(
	visual: Omit<CustomVisual<G, S>, "kind">,
): CustomVisual<G, S> => ({ kind: "customVisual", ...visual });
