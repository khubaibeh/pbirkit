import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Option, Path, Predicate } from "effect";

import { at } from "@pbirkit/core/expr";

import { toPosix } from "./paths.ts";

export const LOCAL_TSCONFIG = ".pbirkit/tsconfig.json";

const parseJson = (text: string): unknown =>
	Option.getOrUndefined(Option.liftThrowable((): unknown => JSON.parse(text))());

const readJson = Effect.fnUntraced(function* (file: string) {
	const fs = yield* FileSystem.FileSystem;

	return yield* fs.readFileString(file).pipe(
		Effect.map(parseJson),
		Effect.orElseSucceed(() => {}),
	);
});

const exportsOf = (value: unknown): ReadonlyArray<readonly [string, string]> =>
	Predicate.isReadonlyObject(value)
		? Object.entries(value).flatMap(([key, target]) =>
				typeof target === "string" ? [[key, target] as const] : [],
			)
		: [];

const coreTypePaths = Effect.fnUntraced(function* () {
	const path = yield* Path.Path;

	const root = fileURLToPath(new URL("../", import.meta.resolve("@pbirkit/core/config")));
	const manifest = yield* readJson(path.join(root, "package.json"));
	if (at(manifest, "name") !== "@pbirkit/core") return {};
	const paths: Readonly<Record<string, ReadonlyArray<string>>> = Object.fromEntries(
		exportsOf(at(manifest, "exports")).map(([key, target]) => [
			`@pbirkit/core${key.slice(1)}`,
			[toPosix(path, path.join(root, target))],
		]),
	);
	return paths;
});

const writeCoreTypes = Effect.fnUntraced(function* (folder: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	if (at(yield* readJson(path.join(folder, "tsconfig.json")), "extends") !== `./${LOCAL_TSCONFIG}`)
		return yield* Effect.void;
	const target = path.join(folder, LOCAL_TSCONFIG);
	const text = `${JSON.stringify({ compilerOptions: { paths: yield* coreTypePaths() } }, null, "\t")}\n`;
	if (Option.getOrUndefined(yield* fs.readFileString(target).pipe(Effect.option)) === text)
		return yield* Effect.void;
	yield* fs.makeDirectory(path.dirname(target), { recursive: true });
	return yield* fs.writeFileString(target, text);
});

export const refreshCoreTypes = (folder: string) => writeCoreTypes(folder).pipe(Effect.ignore);
