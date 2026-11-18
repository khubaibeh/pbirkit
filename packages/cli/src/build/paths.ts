import type { Path } from "effect";

export const STATE_FOLDER = ".pbirkit";

export interface ProjectPaths {
	readonly configFile: string;
	readonly out: string;
	readonly outKey: string;
	readonly state: string;
	readonly lastBuild: string;
	readonly cache: string;
	readonly manifest: string;
}

export const toPosix = (path: Path.Path, relative: string): string => relative.split(path.sep).join("/");

export const projectPaths = (path: Path.Path, configFlag: string, outFlag: string): ProjectPaths => {
	const configFile = path.resolve(configFlag);
	const root = path.dirname(configFile);
	const out = path.resolve(root, outFlag);
	const state = path.join(root, STATE_FOLDER);
	return {
		configFile,
		out,
		outKey: toPosix(path, path.relative(root, out)),
		state,
		lastBuild: path.join(state, "last-build"),
		cache: path.join(state, "cache.abf"),
		manifest: path.join(state, "manifest.json"),
	};
};

export const foldersBetween = (path: Path.Path, file: string, root: string): ReadonlyArray<string> => {
	const folder = path.dirname(file);
	return folder === root || !folder.startsWith(root) ? [] : [folder, ...foldersBetween(path, folder, root)];
};

export const fromCwd = (path: Path.Path, target: string): string =>
	path.relative(process.cwd(), target) || ".";
