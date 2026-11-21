import { String, TaggedError } from "effect/Schema";

import { ReportSelector } from "@pbirkit/core/tree";

export class TargetMissingError extends TaggedError<TargetMissingError, { readonly brand: unique symbol }>()(
	"TargetMissingError",
	{
		folder: String,
	},
) {}

export class SelectorNotFoundError extends TaggedError<
	SelectorNotFoundError,
	{ readonly brand: unique symbol }
>()("SelectorNotFoundError", {
	kind: ReportSelector,
	selector: String,
}) {}
