import { String, TaggedError } from "effect/Schema";

export class ImportOutputError extends TaggedError<ImportOutputError, { readonly brand: unique symbol }>()(
	"ImportOutputError",
	{
		path: String,
		detail: String,
	},
) {}
