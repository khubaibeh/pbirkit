import { String, TaggedError } from "effect/Schema";

import type {
	ConfigCheckError,
	ConfigLoadError,
	ConfigShapeError,
	FileSystemError,
} from "../build/errors.ts";

export class DesktopError extends TaggedError<DesktopError>()("DesktopError", {
	code: String,
	detail: String,
}) {}

export type DesktopCommandError =
	| ConfigLoadError
	| ConfigShapeError
	| ConfigCheckError
	| FileSystemError
	| DesktopError;
