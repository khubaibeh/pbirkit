import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Path, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { BuildFile } from "@pbirkit/core/build";

import { ConfigCheckError, SourceReadError } from "./errors.ts";
import { toPosix } from "./paths.ts";
import type { TreeFile } from "./tree.ts";
import { fileKey, isTracked, parentKeys, pathClashes, treeFile, treeOf } from "./tree.ts";

const encoder = new TextEncoder();

const CRLF_FILES = [".tmdl", ".json"];

const LF = 10;

const CR = 13;

const isLoneLf = (bytes: Uint8Array, index: number): boolean =>
	bytes[index] === LF && bytes[index - 1] !== CR;

const toCrlf = (bytes: Uint8Array): Uint8Array => {
	if (bytes.includes(0)) return bytes;

	const lone = bytes.filter((_, index) => isLoneLf(bytes, index)).length;
	if (lone === 0) return bytes;

	const result = new Uint8Array(bytes.length + lone);
	let at = 0;
	for (const [index, byte] of bytes.entries()) {
		if (isLoneLf(bytes, index)) {
			result[at] = CR;
			at += 1;
		}
		result[at] = byte;
		at += 1;
	}

	return result;
};

const desktopEndings = (path: string, bytes: Uint8Array): Uint8Array =>
	CRLF_FILES.some((extension) => fileKey(path).endsWith(extension)) ? toCrlf(bytes) : bytes;

const rawFile = (path: string, bytes: Uint8Array): TreeFile => treeFile(path, desktopEndings(path, bytes));

const ignoredBy = Effect.fnUntraced(function* (root: string, entries: ReadonlyArray<string>) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

	const ask = (paths: ReadonlyArray<string>) =>
		spawner
			.string(
				ChildProcess.make("git", ["check-ignore", "--stdin", "-z"], {
					cwd: root,
					stdin: Stream.make(encoder.encode(paths.map((item) => `./${item}`).join("\0"))),
				}),
			)
			.pipe(Effect.orElseSucceed(() => ""));

	if (entries.length === 0 || (yield* ask(["."])) !== "") return new Set<string>();

	return new Set(
		(yield* ask(entries))
			.split("\0")
			.filter((item) => item !== "")
			.map((item) => item.replace(/^\.\//u, "")),
	);
});

export const toFilePath = (url: URL, target: string) =>
	Effect.try({
		try: () => fileURLToPath(url),
		catch: (cause) => new SourceReadError({ source: url.href, target, detail: String(cause) }),
	});

const readSource = Effect.fnUntraced(function* (source: string, target: string) {
	const fs = yield* FileSystem.FileSystem;

	return yield* fs
		.readFile(source)
		.pipe(Effect.mapError((error) => new SourceReadError({ source, target, detail: error.message })));
});

const readFolder = Effect.fnUntraced(function* (sourceFolder: URL, target: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const root = yield* toFilePath(sourceFolder, target);
	const fail = (error: { readonly message: string }) =>
		new SourceReadError({ source: root, target, detail: error.message });

	const entries = (yield* fs.readDirectory(root, { recursive: true }).pipe(Effect.mapError(fail)))
		.map((entry) => toPosix(path, entry))
		.filter((entry) => !entry.split("/").includes(".git"));
	const ignored = yield* ignoredBy(root, entries);
	const files: Array<TreeFile> = [];

	for (const entry of entries.filter((item) => !ignored.has(item))) {
		const source = path.join(root, entry);
		if ((yield* fs.stat(source).pipe(Effect.mapError(fail))).type !== "File") continue;

		const relative = `${target}/${entry}`;
		files.push(rawFile(relative, yield* readSource(source, relative)));
	}

	return files;
});

const readBuildFile = Effect.fnUntraced(function* (file: BuildFile) {
	if ("content" in file) return [treeFile(file.path, encoder.encode(file.content))];
	if ("source" in file)
		return [rawFile(file.path, yield* readSource(yield* toFilePath(file.source, file.path), file.path))];

	return yield* readFolder(file.sourceFolder, file.path);
});

const folderClashes = (files: ReadonlyArray<TreeFile>): ReadonlyArray<string> => {
	const paths = new Map(files.map((file) => [fileKey(file.path), file.path] as const));
	const parents = new Set(files.flatMap((file) => parentKeys(file.path)));

	return [...paths]
		.filter(([key]) => parents.has(key))
		.map(([, path]) => `[ERROR] build: ${path} would be written as a file and as a folder`);
};

const buildIssues = (files: ReadonlyArray<TreeFile>): ReadonlyArray<string> => [
	...pathClashes(files).map((pair) => `[ERROR] build: ${pair} would be written to the same file`),
	...folderClashes(files),
	...files
		.filter((file) => !isTracked(file.path))
		.map((file) => `[ERROR] build: ${file.path} is a file only Desktop writes, so remove it from the source`),
];

export const buildTree = Effect.fnUntraced(function* (files: ReadonlyArray<BuildFile>) {
	const built = (yield* Effect.forEach(files, readBuildFile)).flat();

	const issues = buildIssues(built);
	if (issues.length > 0) return yield* new ConfigCheckError({ issues });

	return treeOf(built);
});
