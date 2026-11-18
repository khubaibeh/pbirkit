import { Match, Option } from "effect";

import type { CacheOutcome } from "./cache.ts";
import type { BuildError, ConflictError, ConflictReason } from "./errors.ts";
import { STATE_FOLDER } from "./paths.ts";
import type { FileAction } from "./plan.ts";
import { countOf } from "./plan.ts";

const REASONS: Record<ConflictReason, string> = {
	changed: "changed since the last build",
	differs: "differs from what the build writes",
	extra: "not written by the build",
};

const fileCount = (count: number): string => `${count} ${count === 1 ? "file" : "files"}`;

const conflictHint = (out: string, lastBuild: Option.Option<string>): string =>
	Option.match(lastBuild, {
		onNone: () =>
			`No earlier build of ${out} is on record, so the build can't tell these files from Desktop edits.`,
		onSome: (folder) =>
			[
				"Port these changes into the source first. To see them, run:",
				`  git diff --no-index "${folder}" "${out}"`,
				"That diff also lists cache.abf and localSettings.json, which Desktop writes on every save.",
			].join("\n"),
	});

const conflictMessage = ({ out, lastBuild, conflicts }: ConflictError): string =>
	[
		`[ERROR] build: ${fileCount(conflicts.length)} in ${out} changed outside the build, so the build stopped and wrote nothing.`,
		...conflicts.map(({ path, reason }) => `  ${REASONS[reason]}: ${path}`),
		conflictHint(out, lastBuild),
		"To overwrite or delete them anyway, run the build again with --force.",
	].join("\n");

export const errorMessage: (error: BuildError) => string = Match.valueTags({
	ConfigLoadError: ({ file, detail }) => `[ERROR] build: cannot load ${file}: ${detail}`,
	ConfigShapeError: ({ file, detail }) => `[ERROR] build: ${file} is not a valid config\n${detail}`,
	ConfigCheckError: ({ issues }) => issues.join("\n"),
	SourceReadError: ({ source, target, detail }) =>
		`[ERROR] build: cannot read ${source} for ${target}: ${detail}`,
	ManifestError: ({ file, detail }) =>
		`[ERROR] build: ${file} is not a valid manifest\n${detail}\nDelete it and run the build again with --force.`,
	ConflictError: conflictMessage,
});

const CACHE_NOTES: Record<CacheOutcome, string> = {
	kept: "",
	missing: "",
	restored: `, restored the data cache from ${STATE_FOLDER}/cache.abf`,
	seeded: ", copied the data cache from the config",
};

export const summary = (
	out: string,
	plan: ReadonlyArray<FileAction>,
	cache: Option.Option<CacheOutcome>,
): string => {
	const kept = countOf(plan, "Keep");
	const deleted = countOf(plan, "Delete");

	return [
		`build: wrote ${fileCount(countOf(plan, "Write"))} to ${out}`,
		kept > 0 ? `, ${kept} unchanged` : "",
		deleted > 0 ? `, removed ${fileCount(deleted)} that ${deleted === 1 ? "is" : "are"} no longer built` : "",
		Option.match(cache, { onNone: () => "", onSome: (outcome) => CACHE_NOTES[outcome] }),
	].join("");
};
