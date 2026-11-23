import { Effect, FileSystem, Path, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { BuildFile } from "@pbirkit/core/build";

import { BuildOutputError, causeDetail, SourceReadError } from "./errors.ts";
import { hasGit } from "./git.ts";
import { toPosix } from "./paths.ts";
import type { TreeFile } from "./tree.ts";
import { fileKey, isOwned, isTracked, parentKeys, pathClashes, treeFile, treeOf } from "./tree.ts";

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

const GIT_MATCHED = 0;

const GIT_NO_MATCH = 1;

const ignoredBy = Effect.fnUntraced(function* (root: string, target: string, entries: ReadonlyArray<string>) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

	const fail = (detail: string) => new SourceReadError({ source: root, target, detail });
	const ask = (paths: ReadonlyArray<string>) =>
		Effect.scoped(
			Effect.gen(function* () {
				const handle = yield* spawner.spawn(
					ChildProcess.make("git", ["check-ignore", "--stdin", "-z"], {
						cwd: root,
						stdin: Stream.make(encoder.encode(paths.map((item) => `./${item}`).join("\0"))),
					}),
				);
				const [stdout, stderr, code] = yield* Effect.all(
					[
						Stream.mkString(Stream.decodeText(handle.stdout)),
						Stream.mkString(Stream.decodeText(handle.stderr)),
						handle.exitCode,
					],
					{ concurrency: "unbounded" },
				);
				if (code !== GIT_MATCHED && code !== GIT_NO_MATCH) {
					return yield* fail(`git check-ignore exited with code ${code}: ${stderr.trim()}`);
				}

				return stdout;
			}),
		).pipe(
			Effect.catchTag("PlatformError", (error) => Effect.fail(fail(`cannot run git: ${causeDetail(error)}`))),
		);

	if (entries.length === 0 || !(yield* hasGit(root)) || (yield* ask(["."])) !== "") return new Set<string>();

	return new Set(
		(yield* ask(entries))
			.split("\0")
			.filter((item) => item !== "")
			.map((item) => item.replace(/^\.\//u, "")),
	);
});

export const toFilePath = Effect.fnUntraced(function* (url: URL, target: string) {
	const path = yield* Path.Path;

	return yield* path
		.fromFileUrl(url)
		.pipe(
			Effect.mapError(
				(error) => new SourceReadError({ source: url.href, target, detail: causeDetail(error) }),
			),
		);
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
	const ignored = yield* ignoredBy(root, target, entries);
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
	if ("text" in file) return [rawFile(file.path, encoder.encode(file.text))];
	if ("source" in file)
		return [rawFile(file.path, yield* readSource(yield* toFilePath(file.source, file.path), file.path))];

	return yield* readFolder(file.sourceFolder, file.path);
});

const folderClashes = (files: ReadonlyArray<TreeFile>): ReadonlyArray<string> => {
	const paths = new Map(files.map((file) => [fileKey(file.path), file.path] as const));
	const parents = new Set(files.flatMap((file) => parentKeys(file.path)));

	return [...paths]
		.filter(([key]) => parents.has(key))
		.map(([, path]) => `${path} would be written as a file and as a folder`);
};

const buildIssues = (files: ReadonlyArray<TreeFile>, owned: ReadonlyArray<string>): ReadonlyArray<string> => [
	...pathClashes(files).map((pair) => `${pair} would be written to the same file`),
	...folderClashes(files),
	...files
		.filter((file) => !isTracked(file.path))
		.map((file) => `${file.path} is a file only Desktop writes, so remove it from the source`),
	...files
		.filter((file) => isOwned(owned, file.path))
		.map((file) => `${file.path} is listed in desktopOwned, so remove it from the source`),
];

export const buildTree = Effect.fnUntraced(function* (
	files: ReadonlyArray<BuildFile>,
	owned: ReadonlyArray<string>,
) {
	const read = yield* Effect.forEach(files, (file) =>
		Effect.map(readBuildFile(file), (items) => ({ items, copied: "sourceFolder" in file })),
	);
	const single = new Set(
		read.flatMap(({ items, copied }) => (copied ? [] : items.map((item) => fileKey(item.path)))),
	);
	const built = read.flatMap(({ items, copied }) =>
		copied ? items.filter((item) => !single.has(fileKey(item.path))) : items,
	);

	const issues = buildIssues(built, owned);
	if (issues.length > 0) return yield* new BuildOutputError({ issues });

	return treeOf(built);
});
