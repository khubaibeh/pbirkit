import { Effect, FileSystem, HashMap, Path } from "effect";
import { Record, String, Struct, decodeUnknownEffect, encodeEffect, fromJsonString } from "effect/Schema";

import { ManifestError } from "./errors.ts";
import type { Output } from "./outputs.ts";
import type { ProjectPaths } from "./paths.ts";

const Manifest = Struct({ out: String, files: Record(String, String) });

const ManifestJson = fromJsonString(Manifest, { space: 2 });

export type LastHashes = HashMap.HashMap<string, string>;

export const loadLastHashes = Effect.fnUntraced(function* (paths: ProjectPaths) {
	const fs = yield* FileSystem.FileSystem;
	if (!(yield* fs.exists(paths.manifest))) return HashMap.empty<string, string>();
	const manifest = yield* decodeUnknownEffect(ManifestJson)(yield* fs.readFileString(paths.manifest)).pipe(
		Effect.mapError((error) => new ManifestError({ file: paths.manifest, detail: error.message })),
	);
	return manifest.out === paths.outKey
		? HashMap.fromIterable(Object.entries(manifest.files))
		: HashMap.empty<string, string>();
});

const writeLastBuild = Effect.fnUntraced(function* (paths: ProjectPaths, outputs: ReadonlyArray<Output>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	yield* fs.remove(paths.lastBuild, { recursive: true, force: true });
	for (const { path: relative, bytes } of outputs) {
		const target = path.join(paths.lastBuild, relative);
		yield* fs.makeDirectory(path.dirname(target), { recursive: true });
		yield* fs.writeFile(target, bytes);
	}
});

const writeManifest = Effect.fnUntraced(function* (paths: ProjectPaths, outputs: ReadonlyArray<Output>) {
	const fs = yield* FileSystem.FileSystem;
	const files = Object.fromEntries(outputs.map((output) => [output.path, output.hash]));
	const text = yield* encodeEffect(ManifestJson)({ out: paths.outKey, files }).pipe(
		Effect.mapError((error) => new ManifestError({ file: paths.manifest, detail: error.message })),
	);
	yield* fs.writeFileString(paths.manifest, `${text}\n`);
});

export const saveState = Effect.fnUntraced(function* (paths: ProjectPaths, outputs: ReadonlyArray<Output>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	yield* writeLastBuild(paths, outputs);
	yield* writeManifest(paths, outputs);
	yield* fs.writeFileString(path.join(paths.state, ".gitignore"), "*\n");
});
