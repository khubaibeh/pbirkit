import { Option } from "effect";

import type { CacheOutcome } from "./cache.ts";
import type { ConflictError, ConflictReason } from "./errors.ts";
import type { Change, Pending, PendingKind } from "./merge.ts";
import { MARKER, STATE_FOLDER } from "./paths.ts";
import type { Loss } from "./tmdl.ts";

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
	reformatted: "reformatted in Desktop",
	deleted: "deleted in Desktop",
};

const MAX_LOSSES = 20;

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

export const conflictMessage = ({ out, snapshot, conflicts }: ConflictError): string =>
	[
		`[ERROR] build: ${fileCount(conflicts.length)} in ${out} can't be merged, so the build stopped and wrote nothing.`,
		...conflicts.map(({ path, reason }) => `  ${REASONS[reason]}: ${path}`),
		...conflictHint(out, snapshot),
		"To pick a side for these files, run the build again with --prefer src or --prefer desktop.",
	].join("\n");

export interface Summary {
	readonly out: string;
	readonly recorded: boolean;
	readonly changes: ReadonlyArray<Change>;
	readonly total: number;
	readonly merged: ReadonlyArray<string>;
	readonly cache: Option.Option<CacheOutcome>;
	readonly modelChanged: boolean;
	readonly pending: ReadonlyArray<Pending>;
	readonly losses: ReadonlyArray<Loss>;
	readonly discarded: ReadonlyArray<string>;
	readonly desktopChecked: boolean;
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

const UNCHECKED_NOTE =
	"The build can't check Desktop from this OS. If Desktop has the project open, close it without saving, or its next save brings the changes back.";

const discardBlock = ({ discarded, desktopChecked }: Summary): ReadonlyArray<string> => [
	...(discarded.length === 0
		? []
		: [
				`Threw away the Desktop changes in ${fileCount(discarded.length)}:`,
				...discarded.map((path) => `  ${path}`),
			]),
	...(desktopChecked ? [] : [UNCHECKED_NOTE]),
];

const lossBlock = ({ losses }: Summary): ReadonlyArray<string> =>
	losses.length === 0
		? []
		: [
				`[WARN] build: Desktop removed ${losses.length} ${losses.length === 1 ? "part" : "parts"} of the model that src still has, and the build kept the Desktop version:`,
				...losses.slice(0, MAX_LOSSES).map(({ path, part }) => `  ${part} (${path})`),
				...(losses.length > MAX_LOSSES ? [`  and ${losses.length - MAX_LOSSES} more`] : []),
				"If Desktop dropped them by mistake, close Desktop without saving and run pbirkit build --discard-desktop. If you removed them on purpose, remove them from src too.",
			];

const reformattedNote = (count: number): ReadonlyArray<string> =>
	count === 0
		? []
		: [
				`Desktop only reformatted ${fileCount(count)} (key order, whitespace or line endings). Nothing to port there.`,
			];

const pendingBlock = ({ out, pending, snapshot }: Summary): ReadonlyArray<string> => {
	const changed = pending.filter(({ kind }) => kind !== "reformatted");

	return changed.length === 0
		? []
		: [
				`[WARN] build: Desktop changes not in src yet (${fileCount(changed.length)}). The build kept them. Port them to src, then build again:`,
				...changed.map(({ path, kind }) => `  ${PENDING[kind]}: ${path}`),
				...(changed.some(({ kind }) => kind === "added") ? [ADDED_NOTE] : []),
				"To see the changed values, run pbirkit diff. To see the raw files, run:",
				diffCommand(snapshot, out),
				IGNORED_NOTE,
				"To throw them away instead, close Desktop without saving and run pbirkit build --discard-desktop.",
			];
};

export const summary = (input: Summary): string =>
	[
		headline(input),
		...(input.modelChanged ? ["The model changed since the last build. Refresh the data in Desktop."] : []),
		...discardBlock(input),
		...(input.recorded
			? reformattedNote(input.pending.filter(({ kind }) => kind === "reformatted").length)
			: []),
	].join("\n");

export const desktopWarnings = (input: Summary): ReadonlyArray<string> =>
	input.recorded ? [...lossBlock(input), ...pendingBlock(input)] : [];
