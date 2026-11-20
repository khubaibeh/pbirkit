import { String, TaggedError } from "effect/Schema";

export class ProjectSourceError extends TaggedError<ProjectSourceError>()("ProjectSourceError", {
	path: String,
	detail: String,
}) {}
