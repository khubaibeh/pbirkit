import { String, Struct } from "effect/Schema";

export const ByPath = Struct({
	path: String,
});

export type ByPath = typeof ByPath.Type;
