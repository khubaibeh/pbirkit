import { Array, Literals, Option, String, Struct, TaggedError } from "effect/Schema";

export const ConflictReason = Literals(["changed", "differs", "extra"]);

export type ConflictReason = typeof ConflictReason.Type;

export const Conflict = Struct({ path: String, reason: ConflictReason });

export type Conflict = typeof Conflict.Type;

export class ConfigLoadError extends TaggedError<ConfigLoadError>()("ConfigLoadError", {
	file: String,
	detail: String,
}) {}

export class ConfigShapeError extends TaggedError<ConfigShapeError>()("ConfigShapeError", {
	file: String,
	detail: String,
}) {}

export class ConfigCheckError extends TaggedError<ConfigCheckError>()("ConfigCheckError", {
	issues: Array(String),
}) {}

export class SourceReadError extends TaggedError<SourceReadError>()("SourceReadError", {
	source: String,
	target: String,
	detail: String,
}) {}

export class ManifestError extends TaggedError<ManifestError>()("ManifestError", {
	file: String,
	detail: String,
}) {}

export class ConflictError extends TaggedError<ConflictError>()("ConflictError", {
	out: String,
	lastBuild: Option(String),
	conflicts: Array(Conflict),
}) {}

export type BuildError =
	| ConfigLoadError
	| ConfigShapeError
	| ConfigCheckError
	| SourceReadError
	| ManifestError
	| ConflictError;
