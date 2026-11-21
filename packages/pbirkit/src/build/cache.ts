import { Effect, FileSystem, Option, Path } from "effect";
import { Literals } from "effect/Schema";

import type { ModelCache } from "@pbirkit/core/build";

import { onFileSystem } from "./errors.ts";
import { toFilePath } from "./outputs.ts";
import type { ProjectPaths } from "./paths.ts";

export const CacheOutcome = Literals(["kept", "restored", "seeded", "missing"]);

export type CacheOutcome = typeof CacheOutcome.Type;

const copyInto = Effect.fnUntraced(function* (source: string, destination: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	yield* fs
		.makeDirectory(path.dirname(destination), { recursive: true })
		.pipe(onFileSystem("create", destination));
	yield* fs.copyFile(source, destination).pipe(onFileSystem("copy", source));
});

export const checkSeed = (cache: ModelCache) =>
	Effect.forEach(Option.toArray(cache.seed), (seed) => toFilePath(seed, cache.path), { discard: true });

export const keepCache = Effect.fnUntraced(function* (paths: ProjectPaths, cache: ModelCache) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const built = path.join(paths.out, cache.path);
	if (yield* fs.exists(built).pipe(onFileSystem("check", built))) yield* copyInto(built, paths.cache);
});

export const restoreCache = Effect.fnUntraced(function* (paths: ProjectPaths, cache: ModelCache) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const built = path.join(paths.out, cache.path);

	if (yield* fs.exists(built).pipe(onFileSystem("check", built))) return "kept";

	if (paths.recorded && (yield* fs.exists(paths.cache).pipe(onFileSystem("check", paths.cache)))) {
		yield* copyInto(paths.cache, built);

		return "restored";
	}

	if (Option.isNone(cache.seed)) return "missing";

	yield* copyInto(yield* toFilePath(cache.seed.value, cache.path), built);

	return "seeded";
});
