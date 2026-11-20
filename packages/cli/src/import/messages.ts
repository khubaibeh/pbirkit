import { Match } from "effect";

import type { BuildError, FileSystemError, PathClashError } from "../build/errors.ts";
import { errorMessage as buildErrorMessage } from "../build/messages.ts";
import type { ImportOutputError, ImportSourceError } from "./errors.ts";
import type { ImportOutput } from "./output.ts";

export const errorMessage: (
	error: ImportOutputError | ImportSourceError | FileSystemError | PathClashError,
) => string = Match.valueTags({
	ImportSourceError: ({ path, detail }) => `[ERROR] import: cannot import ${path}: ${detail}`,
	ImportOutputError: ({ path, detail }) => `[ERROR] import: cannot write to ${path}: ${detail}`,
	FileSystemError: ({ operation, path, detail }) => `[ERROR] import: cannot ${operation} ${path}: ${detail}`,
	PathClashError: ({ folder, pairs }) =>
		[
			`[ERROR] import: ${folder} holds files whose names differ only in letter case:`,
			...pairs.map((pair) => `  ${pair}`),
		].join("\n"),
});

export const verificationErrorMessage = (error: BuildError | ImportSourceError): string =>
	error._tag === "ImportSourceError" || error._tag === "FileSystemError" || error._tag === "PathClashError"
		? errorMessage(error)
		: buildErrorMessage(error).replaceAll(/^\[ERROR\] build:/gmu, "[ERROR] import:");

export const summary = (config: string, verified: number, fallbacks: ImportOutput["fallbacks"]): string =>
	[
		`import: wrote ${config}`,
		`import: verified ${verified} ${verified === 1 ? "file" : "files"}`,
		...fallbacks.map(({ group, reason }) => `  ${group}: ${reason}`),
	].join("\n");
