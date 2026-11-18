import { Effect, FileSystem, HashMap, Option, Path } from "effect";

import { onFileSystem } from "./errors.ts";
import type { ProjectPaths } from "./paths.ts";
import { snapshotFiles, snapshotFolder, snapshotRoot } from "./paths.ts";
import type { Tree } from "./tree.ts";
import { clearFolder, hash, readTree, writeFileSafely, writeTree } from "./tree.ts";

export interface Snapshot {
	readonly id: string;
	readonly tree: Tree;
}

export interface BuildState {
	readonly snapshot: Option.Option<Snapshot>;
	readonly unfinished: ReadonlyArray<Snapshot>;
}

const SNAPSHOT_ID = /^[0-9a-f]{64}$/u;

const encoder = new TextEncoder();

export const snapshotId = (tree: Tree): string =>
	hash(
		encoder.encode(
			[...HashMap.values(tree)]
				.map((file) => `${file.path}\u0000${file.hash}\n`)
				.toSorted()
				.join(""),
		),
	);

export const prepareState = Effect.fnUntraced(function* (paths: ProjectPaths) {
	const fs = yield* FileSystem.FileSystem;

	yield* fs.makeDirectory(paths.state, { recursive: true }).pipe(onFileSystem("create", paths.state));
	yield* fs.writeFileString(paths.stateIgnore, "*\n").pipe(onFileSystem("write", paths.stateIgnore));
});

const readIds = Effect.fnUntraced(function* (file: string) {
	const fs = yield* FileSystem.FileSystem;

	if (!(yield* fs.exists(file).pipe(onFileSystem("check", file)))) return [];

	const text = yield* fs.readFileString(file).pipe(onFileSystem("read", file));

	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => SNAPSHOT_ID.test(line));
});

const loadSnapshotById = Effect.fnUntraced(function* (paths: ProjectPaths, id: string) {
	const path = yield* Path.Path;

	const tree = yield* readTree(snapshotFolder(path, paths, id));

	return Option.filter(
		Option.map(tree, (files): Snapshot => ({ id, tree: files })),
		(snapshot) => snapshotId(snapshot.tree) === id,
	);
});

export const loadState = Effect.fnUntraced(function* (paths: ProjectPaths) {
	const marker = Option.fromNullishOr((yield* readIds(paths.marker)).at(0));
	const snapshot = Option.isSome(marker)
		? yield* loadSnapshotById(paths, marker.value)
		: Option.none<Snapshot>();

	const pendingIds = (yield* readIds(paths.pending)).filter((id) => !Option.contains(marker, id));
	const unfinished = yield* Effect.forEach(pendingIds, (id) => loadSnapshotById(paths, id));

	const state: BuildState = { snapshot, unfinished: unfinished.flatMap((found) => Option.toArray(found)) };

	return state;
});

export const saveSnapshot = Effect.fnUntraced(function* (paths: ProjectPaths, snapshot: Snapshot) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	if (Option.isSome(yield* loadSnapshotById(paths, snapshot.id))) return;

	const folder = snapshotRoot(path, paths, snapshot.id);
	const temporary = `${folder}.tmp`;
	yield* clearFolder(temporary);
	yield* writeTree(snapshotFiles(path, temporary), snapshot.tree);
	yield* clearFolder(folder);
	yield* fs.rename(temporary, folder).pipe(onFileSystem("rename", temporary));
});

export const markPending = Effect.fnUntraced(function* (paths: ProjectPaths, id: string) {
	const fs = yield* FileSystem.FileSystem;

	const ids = [...new Set([...(yield* readIds(paths.pending)), id])];
	yield* fs.writeFileString(paths.pending, `${ids.join("\n")}\n`).pipe(onFileSystem("write", paths.pending));
});

export const commitSnapshot = Effect.fnUntraced(function* (paths: ProjectPaths, id: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	yield* writeFileSafely(paths.staging, paths.marker, encoder.encode(`${id}\n`));
	yield* fs.remove(paths.pending, { force: true }).pipe(onFileSystem("remove", paths.pending));

	const entries = yield* fs.readDirectory(paths.snapshots).pipe(onFileSystem("list", paths.snapshots));

	for (const entry of entries.filter((name) => name !== id)) {
		yield* clearFolder(path.join(paths.snapshots, entry));
	}
});
