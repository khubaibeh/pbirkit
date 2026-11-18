import { Effect, Option, Path } from "effect";

import { OutFolderError } from "./errors.ts";

export const STATE_FOLDER = ".pbirkit";

export const MARKER = ".pbirkit-snapshot";

export const STAGING_FOLDER = ".pbirkit-staging";

export const DEFAULT_OUT = "dist";

const SNAPSHOTS_FOLDER = "snapshot";

const SNAPSHOT_FILES_FOLDER = "files";

const PENDING_FILE = "pending";

const CACHE_FILE = "cache.abf";

const IGNORE_FILE = ".gitignore";

export interface ProjectPaths {
	readonly root: string;
	readonly out: string;
	readonly recorded: boolean;
	readonly state: string;
	readonly stateIgnore: string;
	readonly snapshots: string;
	readonly pending: string;
	readonly cache: string;
	readonly marker: string;
	readonly staging: string;
}

export const toPosix = (path: Path.Path, relative: string): string => relative.split(path.sep).join("/");

export const projectPaths = (
	path: Path.Path,
	configFile: string,
	configOut: string,
	outFlag: Option.Option<string>,
): ProjectPaths => {
	const root = path.dirname(configFile);
	const recordedOut = path.resolve(root, configOut);
	const out = Option.match(outFlag, { onNone: () => recordedOut, onSome: (flag) => path.resolve(flag) });
	const state = path.join(root, STATE_FOLDER);

	return {
		root,
		out,
		recorded: out === recordedOut,
		state,
		stateIgnore: path.join(state, IGNORE_FILE),
		snapshots: path.join(state, SNAPSHOTS_FOLDER),
		pending: path.join(state, PENDING_FILE),
		cache: path.join(state, CACHE_FILE),
		marker: path.join(out, MARKER),
		staging: path.join(out, STAGING_FOLDER),
	};
};

export const snapshotRoot = (path: Path.Path, paths: ProjectPaths, id: string): string =>
	path.join(paths.snapshots, id);

export const snapshotFiles = (path: Path.Path, root: string): string =>
	path.join(root, SNAPSHOT_FILES_FOLDER);

export const snapshotFolder = (path: Path.Path, paths: ProjectPaths, id: string): string =>
	snapshotFiles(path, snapshotRoot(path, paths, id));

const isInside = (path: Path.Path, folder: string, target: string): boolean => {
	const relative = path.relative(folder, target);
	const outside = relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);

	return !outside;
};

export const checkOut = Effect.fnUntraced(function* (paths: ProjectPaths) {
	const path = yield* Path.Path;

	if (isInside(path, paths.out, paths.root)) {
		yield* new OutFolderError({ out: paths.out, detail: "it must not hold the config folder" });
	}
	if (isInside(path, paths.state, paths.out)) {
		yield* new OutFolderError({ out: paths.out, detail: `it must not be inside ${STATE_FOLDER}` });
	}
});

export const foldersBetween = (path: Path.Path, file: string, root: string): ReadonlyArray<string> => {
	const folder = path.dirname(file);

	return folder === root || !folder.startsWith(root) ? [] : [folder, ...foldersBetween(path, folder, root)];
};

export const fromCwd = (path: Path.Path, target: string): string =>
	path.relative(process.cwd(), target) || ".";
