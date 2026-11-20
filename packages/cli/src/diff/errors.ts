import { Literals, String, TaggedError } from "effect/Schema";

import type { BuildError } from "../build/errors.ts";

export class TargetMissingError extends TaggedError<TargetMissingError>()("TargetMissingError", {
	folder: String,
}) {}

export const SelectorKind = Literals(["page", "visual", "bookmark", "theme"]);

export type SelectorKind = typeof SelectorKind.Type;

export class SelectorNotFoundError extends TaggedError<SelectorNotFoundError>()("SelectorNotFoundError", {
	kind: SelectorKind,
	name: String,
}) {}

export type DiffError = BuildError | TargetMissingError | SelectorNotFoundError;
