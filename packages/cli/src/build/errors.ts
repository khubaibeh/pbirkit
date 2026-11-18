import { Effect } from "effect";
import { Array, Literals, Option, String, Struct, TaggedError } from "effect/Schema";

export const ConflictReason = Literals([
	"both-changed",
	"added-in-both",
	"deleted-in-desktop",
	"deleted-in-src",
	"no-snapshot",
	"file-and-folder",
]);

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

export class OutFolderError extends TaggedError<OutFolderError>()("OutFolderError", {
	out: String,
	detail: String,
}) {}

export class GitRepoError extends TaggedError<GitRepoError>()("GitRepoError", {
	folder: String,
}) {}

export class FileSystemError extends TaggedError<FileSystemError>()("FileSystemError", {
	operation: String,
	path: String,
	detail: String,
}) {}

export class ProjectChangedError extends TaggedError<ProjectChangedError>()("ProjectChangedError", {
	path: String,
}) {}

export class PathClashError extends TaggedError<PathClashError>()("PathClashError", {
	folder: String,
	pairs: Array(String),
}) {}

export class ConflictError extends TaggedError<ConflictError>()("ConflictError", {
	out: String,
	snapshot: Option(String),
	conflicts: Array(Conflict),
}) {}

export type BuildError =
	| ConfigLoadError
	| ConfigShapeError
	| ConfigCheckError
	| SourceReadError
	| OutFolderError
	| GitRepoError
	| FileSystemError
	| ProjectChangedError
	| PathClashError
	| ConflictError;

export const onFileSystem =
	(operation: string, path: string) =>
	<A, E extends { readonly message: string }, R>(effect: Effect.Effect<A, E, R>) =>
		Effect.mapError(effect, (error) => new FileSystemError({ operation, path, detail: error.message }));
