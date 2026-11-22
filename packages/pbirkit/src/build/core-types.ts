import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Option, Path, Predicate } from "effect";

import { at } from "@pbirkit/core/expr";

import { CORE_PACKAGE } from "../core-package.ts";
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

const HIDDEN_TARGET = "hidden";

type TypesEntry = readonly [string, string | undefined];

const exportsOf = (value: unknown): ReadonlyArray<TypesEntry> =>
	Predicate.isReadonlyObject(value)
		? Object.entries(value).flatMap(([key, target]): ReadonlyArray<TypesEntry> => {
				if (target === null) return [[key, undefined] as const];
				const types = typeof target === "string" ? target : at(target, "types");
				return typeof types === "string" ? [[key, types] as const] : [];
			})
		: [];

const coreTypePaths = Effect.fnUntraced(function* () {
	const path = yield* Path.Path;

	const root = fileURLToPath(new URL("../", import.meta.resolve(`${CORE_PACKAGE}/config`)));
	const manifest = yield* readJson(path.join(root, "package.json"));
	if (at(manifest, "name") !== CORE_PACKAGE) return {};
	const entries = exportsOf(at(manifest, "exports"));
	const paths: Readonly<Record<string, ReadonlyArray<string>>> = Object.fromEntries(
		[
			...entries.filter(([, target]) => target === undefined),
			...entries.filter(([, target]) => target !== undefined),
		].map(([key, target]) => [
			`${CORE_PACKAGE}${key.slice(1)}`,
			[toPosix(path, path.join(root, target ?? HIDDEN_TARGET))],
		]),
	);
	return paths;
});

const NODE_TYPES = "@types/node/package.json";

const hasNodeTypes = (folder: string): boolean =>
	Option.isSome(Option.liftThrowable(() => createRequire(`${folder}/`).resolve(NODE_TYPES))());

const writeCoreTypes = Effect.fnUntraced(function* (folder: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	if (at(yield* readJson(path.join(folder, "tsconfig.json")), "extends") !== `./${LOCAL_TSCONFIG}`)
		return yield* Effect.void;
	const target = path.join(folder, LOCAL_TSCONFIG);
	const compilerOptions = {
		...(hasNodeTypes(folder) ? { types: ["node"] } : {}),
		paths: yield* coreTypePaths(),
	};
	const text = `${JSON.stringify({ compilerOptions }, null, "\t")}\n`;
	if (Option.getOrUndefined(yield* fs.readFileString(target).pipe(Effect.option)) === text)
		return yield* Effect.void;
	yield* fs.makeDirectory(path.dirname(target), { recursive: true });
	return yield* fs.writeFileString(target, text);
});

export const refreshCoreTypes = (folder: string) => writeCoreTypes(folder).pipe(Effect.ignore);
