import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Path } from "effect";

import type { BuildFile } from "@pbirkit/core/build";

import { ConfigCheckError, SourceReadError } from "./errors.ts";
import { toPosix } from "./paths.ts";
import type { TreeFile } from "./tree.ts";
import { isTracked, pathClashes, treeFile, treeOf } from "./tree.ts";

const encoder = new TextEncoder();

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

	const entries = yield* fs.readDirectory(root, { recursive: true }).pipe(Effect.mapError(fail));
	const files: Array<TreeFile> = [];

	for (const entry of entries) {
		const source = path.join(root, entry);
		if ((yield* fs.stat(source).pipe(Effect.mapError(fail))).type !== "File") continue;

		const relative = `${target}/${toPosix(path, entry)}`;
		files.push(treeFile(relative, yield* readSource(source, relative)));
	}

	return files;
});

const readBuildFile = Effect.fnUntraced(function* (file: BuildFile) {
	if ("content" in file) return [treeFile(file.path, encoder.encode(file.content))];
	if ("source" in file)
		return [treeFile(file.path, yield* readSource(yield* toFilePath(file.source, file.path), file.path))];

	return yield* readFolder(file.sourceFolder, file.path);
});

const buildIssues = (files: ReadonlyArray<TreeFile>): ReadonlyArray<string> => [
	...pathClashes(files).map((pair) => `[ERROR] build: ${pair} would be written to the same file`),
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
