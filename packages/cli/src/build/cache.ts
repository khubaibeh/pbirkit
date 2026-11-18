import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Option, Path } from "effect";
import { Literals } from "effect/Schema";

import type { ModelCache } from "@pbirkit/core/build";

import type { ProjectPaths } from "./paths.ts";

export const CacheOutcome = Literals(["kept", "restored", "seeded", "missing"]);

export type CacheOutcome = typeof CacheOutcome.Type;

const target = (path: Path.Path, paths: ProjectPaths, cache: ModelCache): string =>
	path.join(paths.out, cache.path);

export const keepCache = Effect.fnUntraced(function* (paths: ProjectPaths, cache: ModelCache) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const built = target(path, paths, cache);

	if (!(yield* fs.exists(built))) return;

	yield* fs.makeDirectory(paths.state, { recursive: true });
	yield* fs.copyFile(built, paths.cache);
});

const copyInto = Effect.fnUntraced(function* (source: string, destination: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
	yield* fs.copyFile(source, destination);
});

export const restoreCache = Effect.fnUntraced(function* (paths: ProjectPaths, cache: ModelCache) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const built = target(path, paths, cache);

	if (yield* fs.exists(built)) return "kept";

	if (yield* fs.exists(paths.cache)) {
		yield* copyInto(paths.cache, built);
		return "restored";
	}

	if (Option.isNone(cache.seed)) return "missing";

	yield* copyInto(fileURLToPath(cache.seed.value), built);
	return "seeded";
});
