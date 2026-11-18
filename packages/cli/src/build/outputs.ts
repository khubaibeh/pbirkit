import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Path } from "effect";

import type { BuildFile } from "@pbirkit/core/build";

import { SourceReadError } from "./errors.ts";
import { toPosix } from "./paths.ts";

export interface Output {
	readonly path: string;
	readonly bytes: Uint8Array;
	readonly hash: string;
}

const encoder = new TextEncoder();

export const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const output = (path: string, bytes: Uint8Array): Output => ({ path, bytes, hash: hash(bytes) });

const readSource = Effect.fnUntraced(function* (source: string, target: string) {
	const fs = yield* FileSystem.FileSystem;
	return yield* fs
		.readFile(source)
		.pipe(Effect.mapError((error) => new SourceReadError({ source, target, detail: error.message })));
});

const readFolder = Effect.fnUntraced(function* (sourceFolder: URL, target: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const root = fileURLToPath(sourceFolder);

	const entries = yield* fs
		.readDirectory(root, { recursive: true })
		.pipe(Effect.mapError((error) => new SourceReadError({ source: root, target, detail: error.message })));

	const outputs: Array<Output> = [];

	for (const entry of entries) {
		const source = path.join(root, entry);
		if ((yield* fs.stat(source)).type !== "File") continue;

		const relative = `${target}/${toPosix(path, entry)}`;
		outputs.push(output(relative, yield* readSource(source, relative)));
	}

	return outputs;
});

const readBuildFile = Effect.fnUntraced(function* (file: BuildFile) {
	if ("content" in file) return [output(file.path, encoder.encode(file.content))];
	if ("source" in file) return [output(file.path, yield* readSource(fileURLToPath(file.source), file.path))];

	return yield* readFolder(file.sourceFolder, file.path);
});

export const readOutputs = (files: ReadonlyArray<BuildFile>) =>
	Effect.map(Effect.forEach(files, readBuildFile), (groups) => groups.flat());
