import { Match, Option } from "effect";

import type { CacheOutcome } from "./cache.ts";
import type { BuildError, ConflictError, ConflictReason } from "./errors.ts";
import type { Change, Pending, PendingKind } from "./merge.ts";
import { MARKER, STATE_FOLDER } from "./paths.ts";

const REASONS: Record<ConflictReason, string> = {
	"both-changed": "changed in src and in Desktop",
	"added-in-both": "added in src and in Desktop",
	"deleted-in-desktop": "changed in src, deleted in Desktop",
	"deleted-in-src": "deleted in src, changed in Desktop",
	"no-snapshot": "differs from the build",
	"file-and-folder": "is both a file and a folder",
};

const PENDING: Record<PendingKind, string> = {
	added: "added in Desktop",
	changed: "changed in Desktop",
	deleted: "deleted in Desktop",
};

const CACHE_NOTES: Record<CacheOutcome, string> = {
	kept: "",
	missing: "",
	restored: `, restored the data cache from ${STATE_FOLDER}/cache.abf`,
	seeded: ", copied the data cache from the config",
};

const IGNORED_NOTE = `The diff also lists cache.abf, localSettings.json and ${MARKER}, which the build leaves alone.`;

const ADDED_NOTE =
	"If no config field writes an added file, map it in model.files or report.files, or list it in desktopOwned.";

const fileCount = (count: number): string => `${count} ${count === 1 ? "file" : "files"}`;

export const diffCommand = (snapshot: string, out: string): string =>
	`  git diff --no-index "${snapshot}" "${out}"`;

const conflictHint = (out: string, snapshot: Option.Option<string>): ReadonlyArray<string> =>
	Option.match(snapshot, {
		onNone: () => [
			`No snapshot of ${out} is on record, so the build can't tell which side changed these files.`,
		],
		onSome: (folder) => ["To see what Desktop changed, run:", diffCommand(folder, out), IGNORED_NOTE],
	});

const conflictMessage = ({ out, snapshot, conflicts }: ConflictError): string =>
	[
		`[ERROR] build: ${fileCount(conflicts.length)} in ${out} can't be merged, so the build stopped and wrote nothing.`,
		...conflicts.map(({ path, reason }) => `  ${REASONS[reason]}: ${path}`),
		...conflictHint(out, snapshot),
		"To pick a side for these files, run the build again with --prefer src or --prefer desktop.",
	].join("\n");

export const errorMessage: (error: BuildError) => string = Match.valueTags({
	ConfigLoadError: ({ file, detail }) => `[ERROR] build: cannot load ${file}: ${detail}`,
	ConfigShapeError: ({ file, detail }) => `[ERROR] build: ${file} is not a valid config\n${detail}`,
	ConfigCheckError: ({ issues }) => issues.join("\n"),
	SourceReadError: ({ source, target, detail }) =>
		`[ERROR] build: cannot read ${source} for ${target}: ${detail}`,
	OutFolderError: ({ out, detail }) => `[ERROR] build: cannot build to ${out}: ${detail}`,
	GitRepoError: ({ folder }) =>
		`[ERROR] build: ${folder} is not inside a git repository. Run git init there, then build again.`,
	FileSystemError: ({ operation, path, detail }) => `[ERROR] build: cannot ${operation} ${path}: ${detail}`,
	ProjectChangedError: ({ path }) =>
		`[ERROR] build: ${path} changed while the build ran. Save in Desktop, then build again.`,
	PathClashError: ({ folder, pairs }) =>
		[
			`[ERROR] build: ${folder} holds files whose names differ only in letter case:`,
			...pairs.map((pair) => `  ${pair}`),
		].join("\n"),
	ConflictError: conflictMessage,
});

export interface Summary {
	readonly out: string;
	readonly recorded: boolean;
	readonly changes: ReadonlyArray<Change>;
	readonly total: number;
	readonly merged: ReadonlyArray<string>;
	readonly cache: Option.Option<CacheOutcome>;
	readonly modelChanged: boolean;
	readonly pending: ReadonlyArray<Pending>;
	readonly snapshot: string;
}

const countOf = (changes: ReadonlyArray<Change>, tag: Change["_tag"]): number =>
	changes.filter((change) => change._tag === tag).length;

const headline = ({ out, recorded, changes, total, merged, cache }: Summary): string => {
	const written = countOf(changes, "Write");
	const removed = countOf(changes, "Delete");

	return [
		`build: wrote ${fileCount(written)} to ${out}`,
		total > written ? `, ${total - written} unchanged` : "",
		removed > 0 ? `, removed ${removed}` : "",
		merged.length > 0 ? `, merged ${merged.length} with Desktop changes` : "",
		Option.match(cache, { onNone: () => "", onSome: (outcome) => CACHE_NOTES[outcome] }),
		recorded ? "" : " (scratch build, not recorded)",
	].join("");
};

const pendingBlock = ({ out, pending, snapshot }: Summary): ReadonlyArray<string> =>
	pending.length === 0
		? []
		: [
				`Desktop changes not in src yet (${fileCount(pending.length)}). Port them to src, then build again:`,
				...pending.map(({ path, kind }) => `  ${PENDING[kind]}: ${path}`),
				...(pending.some(({ kind }) => kind === "added") ? [ADDED_NOTE] : []),
				"To see them, run:",
				diffCommand(snapshot, out),
				IGNORED_NOTE,
			];

export const summary = (input: Summary): string =>
	[
		headline(input),
		...(input.modelChanged ? ["The model changed since the last build. Refresh the data in Desktop."] : []),
		...(input.recorded ? pendingBlock(input) : []),
	].join("\n");
