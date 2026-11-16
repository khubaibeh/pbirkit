export type CustomVisualSource = "appSource" | "file" | "organization";

export interface CustomVisual<G extends string, S extends CustomVisualSource> {
	readonly guid: G;
	readonly source: S;
}

export const customVisual = <const G extends string, const S extends CustomVisualSource>(
	visual: CustomVisual<G, S>,
): CustomVisual<G, S> => visual;
