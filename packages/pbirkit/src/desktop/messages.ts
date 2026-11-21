import { Match } from "effect";

import type { Instance, MsCli } from "./bridge.ts";
import type { DesktopCommandError } from "./errors.ts";

const windowCount = (count: number): string =>
	`${count} Desktop ${count === 1 ? "window has" : "windows have"}`;

const unsavedNote = (instance: Instance): string =>
	instance.hasUnsavedChanges === true ? ", Desktop reports unsaved changes" : "";

const openFile = (instance: Instance): string =>
	instance.currentFilePath === undefined || instance.currentFilePath === ""
		? "no file open"
		: instance.currentFilePath;

export const unreachableReason = (instance: Instance): string | null =>
	instance.bridgeStatus === "connected"
		? null
		: (instance.error?.message ?? instance.unavailableReason ?? "the bridge did not answer");

const instanceLine = (instance: Instance, ours: boolean): string => {
	const reason = unreachableReason(instance);

	return reason === null
		? `  pid ${instance.pid}: ${openFile(instance)}${ours ? " (this project)" : ""}${unsavedNote(instance)}`
		: `  pid ${instance.pid}: not reachable: ${reason}`;
};

export const statusMessage = (
	pbip: string,
	instances: ReadonlyArray<Instance>,
	ours: ReadonlyArray<Instance>,
): string =>
	instances.length === 0
		? `desktop: no Desktop window has the bridge open. To open ${pbip}, run pbirkit desktop open.`
		: [
				`desktop: ${windowCount(instances.length)} the bridge open`,
				...instances.map((instance) => instanceLine(instance, ours.includes(instance))),
				...(ours.length > 0 ? [] : [`None of them has ${pbip} open. To open it, run pbirkit desktop open.`]),
			].join("\n");

const bundledHint = (bundled: string): ReadonlyArray<string> => [`  node "${bundled}" --help`];

export const msCliNote = (cli: MsCli): ReadonlyArray<string> =>
	Match.valueTags(cli, {
		Current: () => [],
		Missing: ({ bundled }) => [
			"Microsoft's bridge CLI (powerbi-desktop) is not on your PATH, or it gives no version. To use the copy that ships with pbirkit, run:",
			...bundledHint(bundled),
		],
		Old: ({ version, wanted, bundled }) => [
			`The powerbi-desktop on your PATH is version ${version}, and pbirkit needs ${wanted} or later.`,
			`To update it, run: npm install -g @microsoft/powerbi-desktop-bridge-cli@${wanted}`,
			"To use the copy that ships with pbirkit instead, run:",
			...bundledHint(bundled),
		],
	});

export interface Shot {
	readonly page: string;
	readonly file: string | null;
	readonly error: string | null;
}

const pageCount = (count: number): string => `${count} ${count === 1 ? "page" : "pages"}`;

const shotLine = ({ page, file, error }: Shot): string =>
	error === null ? `  ${file ?? page}` : `  failed: ${page}: ${error.replace(/^\[ERROR\] desktop: /u, "")}`;

export const shotMessage = (pid: number, shots: ReadonlyArray<Shot>): string => {
	const saved = shots.filter((shot) => shot.error === null).length;

	return [
		`desktop: saved ${saved === shots.length ? pageCount(saved) : `${saved} of ${pageCount(shots.length)}`} from pid ${pid}`,
		...shots.map((shot) => shotLine(shot)),
	].join("\n");
};

export const errorMessage: (error: DesktopCommandError) => string = Match.valueTags({
	ConfigLoadError: ({ file, detail }) => `[ERROR] desktop: cannot load ${file}: ${detail}`,
	ConfigShapeError: ({ file, detail }) => `[ERROR] desktop: ${file} is not a valid config\n${detail}`,
	ConfigCheckError: ({ issues }) => issues.join("\n"),
	FileSystemError: ({ operation, path, detail }) => `[ERROR] desktop: cannot ${operation} ${path}: ${detail}`,
	DesktopError: ({ code, detail }) => `[ERROR] desktop: ${detail} (${code})`,
});
