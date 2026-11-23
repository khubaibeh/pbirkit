import { Console, Effect, Match } from "effect";

import type { BuildError } from "./build/errors.ts";
import { conflictMessage } from "./build/messages.ts";
import type { SelectorNotFoundError, TargetMissingError } from "./diff/errors.ts";
import type { ImportOutputError } from "./import/errors.ts";
import type { ProjectSourceError } from "./pbip/errors.ts";

export type CliError =
	| BuildError
	| TargetMissingError
	| SelectorNotFoundError
	| ProjectSourceError
	| ImportOutputError;

export const errorMessage = (command: string): ((error: CliError) => string) => {
	const prefix = `[ERROR] ${command}:`;

	return Match.valueTags({
		ConfigLoadError: ({ file, detail }) => `${prefix} cannot load ${file}: ${detail}`,
		ConfigShapeError: ({ file, detail }) => `${prefix} ${file} is not a valid config\n${detail}`,
		ConfigCheckError: ({ issues }) => issues.join("\n"),
		ConfigBuildError: ({ detail }) => `${prefix} cannot build the config: ${detail}`,
		BuildOutputError: ({ issues }) => issues.map((issue) => `${prefix} ${issue}`).join("\n"),
		SourceReadError: ({ source, target, detail }) =>
			`${prefix} cannot read ${source} for ${target}: ${detail}`,
		OutFolderError: ({ out, detail }) => `${prefix} cannot build to ${out}: ${detail}`,
		GitRepoError: ({ folder }) =>
			`${prefix} ${folder} is not inside a git repository. Run git init there, then build again.`,
		FileSystemError: ({ operation, path, detail }) => `${prefix} cannot ${operation} ${path}: ${detail}`,
		ProjectChangedError: ({ path }) =>
			`${prefix} ${path} changed while the build ran. Save in Desktop, then build again.`,
		PathClashError: ({ folder, pairs }) =>
			[
				`${prefix} ${folder} holds files whose names differ only in letter case:`,
				...pairs.map((pair) => `  ${pair}`),
			].join("\n"),
		ConflictError: conflictMessage,
		DiscardError: ({ detail }) => `${prefix} cannot throw away the Desktop changes: ${detail}.`,
		TargetMissingError: ({ folder }) => `${prefix} target folder ${folder} does not exist`,
		SelectorNotFoundError: ({ kind, selector }) =>
			`${prefix} --${kind} ${JSON.stringify(selector)} matched no files`,
		ProjectSourceError: ({ path, detail }) => `${prefix} cannot read ${path}: ${detail}`,
		ImportOutputError: ({ path, detail }) => `${prefix} cannot write to ${path}: ${detail}`,
	});
};

export const setExitCode = (code: number): Effect.Effect<void> =>
	Effect.sync(() => {
		process.exitCode = code;
	});

export const exitWith =
	(code: number) =>
	(message: string): Effect.Effect<void> =>
		Effect.andThen(Console.error(message), setExitCode(code));
