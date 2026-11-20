import { String, TaggedError } from "effect/Schema";

import { ReportSelector } from "@pbirkit/core/tree";

export class TargetMissingError extends TaggedError<TargetMissingError>()("TargetMissingError", {
	folder: String,
}) {}

export class SelectorNotFoundError extends TaggedError<SelectorNotFoundError>()("SelectorNotFoundError", {
	kind: ReportSelector,
	name: String,
}) {}
