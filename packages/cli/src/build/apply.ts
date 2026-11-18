import { rmdir } from "node:fs/promises";

import { Effect, FileSystem, Option, Path, Predicate } from "effect";

import { FileSystemError, ProjectChangedError, onFileSystem } from "./errors.ts";
import type { Change } from "./merge.ts";
import { foldersBetween } from "./paths.ts";
import type { TreeFile } from "./tree.ts";
import { hash, writeFileSafely } from "./tree.ts";

const NOT_EMPTY = new Set(["ENOTEMPTY", "EEXIST", "ENOENT"]);

const currentHash = Effect.fnUntraced(function* (target: string) {
	const fs = yield* FileSystem.FileSystem;

	if (!(yield* fs.exists(target).pipe(Effect.orElseSucceed(() => false)))) return Option.none<string>();
	if ((yield* fs.stat(target).pipe(onFileSystem("inspect", target))).type !== "File")
		return Option.none<string>();

	return Option.some(hash(yield* fs.readFile(target).pipe(onFileSystem("read", target))));
});

const ensureUnchanged = Effect.fnUntraced(function* (target: string, expected: Option.Option<TreeFile>) {
	const now = yield* currentHash(target);
	const before = Option.map(expected, (file) => file.hash);

	if (Option.isNone(now) ? Option.isSome(before) : !Option.contains(before, now.value)) {
		yield* new ProjectChangedError({ path: target });
	}
});

const removeIfEmpty = (folder: string) =>
	Effect.tryPromise({
		try: () => rmdir(folder),
		catch: (cause) => cause,
	}).pipe(
		Effect.catchIf(
			(cause) => Predicate.hasProperty(cause, "code") && NOT_EMPTY.has(String(cause.code)),
			() => Effect.void,
		),
		Effect.mapError(
			(cause) => new FileSystemError({ operation: "remove", path: folder, detail: String(cause) }),
		),
	);

const removeEmptyFolders = Effect.fnUntraced(function* (out: string, removed: ReadonlyArray<string>) {
	const path = yield* Path.Path;

	const folders = [...new Set(removed.flatMap((target) => foldersBetween(path, target, out)))].toSorted(
		(a, b) => b.length - a.length,
	);

	for (const folder of folders) yield* removeIfEmpty(folder);
});

const targetOf = (path: Path.Path, out: string, change: Change): string => path.join(out, change.file.path);

export const applyChanges = Effect.fnUntraced(function* (
	out: string,
	staging: string,
	changes: ReadonlyArray<Change>,
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	for (const change of changes) {
		const expected = change._tag === "Delete" ? Option.some(change.file) : change.previous;
		yield* ensureUnchanged(targetOf(path, out, change), expected);
	}

	const deletes = changes.filter((change) => change._tag === "Delete");
	for (const change of deletes) {
		const target = targetOf(path, out, change);
		yield* fs.remove(target).pipe(onFileSystem("remove", target));
	}
	yield* removeEmptyFolders(
		out,
		deletes.map((change) => targetOf(path, out, change)),
	);

	for (const change of changes) {
		if (change._tag === "Write")
			yield* writeFileSafely(staging, targetOf(path, out, change), change.file.bytes);
	}
});
