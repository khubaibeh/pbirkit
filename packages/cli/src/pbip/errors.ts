import { String, TaggedError } from "effect/Schema";

export class ProjectSourceError extends TaggedError<ProjectSourceError, { readonly brand: unique symbol }>()(
	"ProjectSourceError",
	{
		path: String,
		detail: String,
	},
) {}
