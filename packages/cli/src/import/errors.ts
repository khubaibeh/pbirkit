import { String, TaggedError } from "effect/Schema";

export class ImportSourceError extends TaggedError<ImportSourceError>()("ImportSourceError", {
	path: String,
	detail: String,
}) {}

export class ImportOutputError extends TaggedError<ImportOutputError>()("ImportOutputError", {
	path: String,
	detail: String,
}) {}
