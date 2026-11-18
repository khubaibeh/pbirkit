import { Effect, FileSystem, Path } from "effect";

import { foldersBetween } from "./paths.ts";
import type { FileAction } from "./plan.ts";

const writeFile = Effect.fnUntraced(function* (target: string, bytes: Uint8Array) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	yield* fs.makeDirectory(path.dirname(target), { recursive: true });
	yield* fs.writeFile(target, bytes);
});

const removeEmptyFolders = Effect.fnUntraced(function* (out: string, removed: ReadonlyArray<string>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const folders = [...new Set(removed.flatMap((target) => foldersBetween(path, target, out)))].toSorted(
		(a, b) => b.length - a.length,
	);
	for (const folder of folders) {
		if ((yield* fs.readDirectory(folder)).length === 0) yield* fs.remove(folder, { recursive: true });
	}
});

export const applyPlan = Effect.fnUntraced(function* (out: string, plan: ReadonlyArray<FileAction>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const removed: Array<string> = [];

	for (const action of plan) {
		if (action._tag === "Write") yield* writeFile(path.join(out, action.path), action.bytes);
		if (action._tag === "Delete") {
			const target = path.join(out, action.path);
			yield* fs.remove(target);
			removed.push(target);
		}
	}

	yield* removeEmptyFolders(out, removed);
});
