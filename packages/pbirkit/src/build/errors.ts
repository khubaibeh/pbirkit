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

export class ConfigLoadError extends TaggedError<ConfigLoadError, { readonly brand: unique symbol }>()(
	"ConfigLoadError",
	{
		file: String,
		detail: String,
	},
) {}

export class ConfigShapeError extends TaggedError<ConfigShapeError, { readonly brand: unique symbol }>()(
	"ConfigShapeError",
	{
		file: String,
		detail: String,
	},
) {}

export class ConfigBuildError extends TaggedError<ConfigBuildError, { readonly brand: unique symbol }>()(
	"ConfigBuildError",
	{
		detail: String,
	},
) {}

export class CoreTypesError extends TaggedError<CoreTypesError, { readonly brand: unique symbol }>()(
	"CoreTypesError",
	{
		file: String,
		detail: String,
	},
) {}

export class ConfigCheckError extends TaggedError<ConfigCheckError, { readonly brand: unique symbol }>()(
	"ConfigCheckError",
	{
		issues: Array(String),
	},
) {}

export class BuildOutputError extends TaggedError<BuildOutputError, { readonly brand: unique symbol }>()(
	"BuildOutputError",
	{
		issues: Array(String),
	},
) {}

export class SourceReadError extends TaggedError<SourceReadError, { readonly brand: unique symbol }>()(
	"SourceReadError",
	{
		source: String,
		target: String,
		detail: String,
	},
) {}

export class OutFolderError extends TaggedError<OutFolderError, { readonly brand: unique symbol }>()(
	"OutFolderError",
	{
		out: String,
		detail: String,
	},
) {}

export class GitRepoError extends TaggedError<GitRepoError, { readonly brand: unique symbol }>()(
	"GitRepoError",
	{
		folder: String,
	},
) {}

export class FileSystemError extends TaggedError<FileSystemError, { readonly brand: unique symbol }>()(
	"FileSystemError",
	{
		operation: String,
		path: String,
		detail: String,
	},
) {}

export class ProjectChangedError extends TaggedError<
	ProjectChangedError,
	{ readonly brand: unique symbol }
>()("ProjectChangedError", {
	path: String,
}) {}

export class PathClashError extends TaggedError<PathClashError, { readonly brand: unique symbol }>()(
	"PathClashError",
	{
		folder: String,
		pairs: Array(String),
	},
) {}

export class ConflictError extends TaggedError<ConflictError, { readonly brand: unique symbol }>()(
	"ConflictError",
	{
		out: String,
		snapshot: Option(String),
		conflicts: Array(Conflict),
	},
) {}

export class DiscardError extends TaggedError<DiscardError, { readonly brand: unique symbol }>()(
	"DiscardError",
	{
		detail: String,
	},
) {}

export type BuildError =
	| ConfigLoadError
	| ConfigShapeError
	| ConfigCheckError
	| ConfigBuildError
	| BuildOutputError
	| SourceReadError
	| OutFolderError
	| GitRepoError
	| FileSystemError
	| ProjectChangedError
	| PathClashError
	| ConflictError
	| DiscardError;

export const causeDetail = (error: { readonly message: string; readonly cause?: unknown }): string =>
	error.cause === undefined ? error.message : globalThis.String(error.cause);

export const onFileSystem =
	(operation: string, path: string) =>
	<A, E extends { readonly message: string }, R>(effect: Effect.Effect<A, E, R>) =>
		Effect.mapError(effect, (error) => new FileSystemError({ operation, path, detail: error.message }));
