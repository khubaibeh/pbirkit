import { String, TaggedError } from "effect/Schema";

export class ImportOutputError extends TaggedError<ImportOutputError>()("ImportOutputError", {
	path: String,
	detail: String,
}) {}
