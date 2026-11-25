import { String, Struct } from "effect/Schema";

/**
 * Binds the report to a local model folder.
 *
 * - `path`: The `.SemanticModel` folder, relative to `definition.pbir`. Use `/` as the separator.
 */
export const ByPath = Struct({
	path: String,
});

export type ByPath = typeof ByPath.Type;
