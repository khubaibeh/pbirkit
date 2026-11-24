import { createRequire } from "node:module";

import { Console, Effect, FileSystem, Option, Path } from "effect";
import {
	decodeUnknownEffect,
	Literal,
	Null,
	optionalKey,
	Record,
	String,
	Struct,
	Union,
} from "effect/Schema";
import { parse } from "jsonc-parser";
import type { ParseError } from "jsonc-parser";

import { at } from "@pbirkit/core/expr";

import { CORE_PACKAGE } from "../core-package.ts";
import { causeDetail, CoreTypesError } from "./errors.ts";
import { toPosix } from "./paths.ts";

export const LOCAL_TSCONFIG = ".pbirkit/tsconfig.json";

const CoreManifest = Struct({
	name: Literal(CORE_PACKAGE),
	exports: Record(String, Union([Null, String, Struct({ types: optionalKey(String) })])),
});

type CoreExports = typeof CoreManifest.Type.exports;

const readJsonc = Effect.fnUntraced(function* (file: string) {
	const fs = yield* FileSystem.FileSystem;

	const text = yield* fs
		.readFileString(file)
		.pipe(Effect.mapError((error) => new CoreTypesError({ file, detail: error.message })));
	const errors: Array<ParseError> = [];
	const value: unknown = parse(text, errors, { allowTrailingComma: true });
	if (errors.length > 0) return yield* new CoreTypesError({ file, detail: "it is not valid JSON" });

	return value;
});

const HIDDEN_TARGET = "hidden";

type TypesEntry = readonly [string, string | undefined];

const exportsOf = (exports: CoreExports): ReadonlyArray<TypesEntry> =>
	Object.entries(exports).flatMap(([key, target]): ReadonlyArray<TypesEntry> => {
		if (target === null) return [[key, undefined] as const];
		const types = typeof target === "string" ? target : target.types;
		return types === undefined ? [] : [[key, types] as const];
	});

const coreTypePaths = Effect.fnUntraced(function* () {
	const path = yield* Path.Path;

	const url = yield* Effect.try({
		try: () => new URL("../", import.meta.resolve(`${CORE_PACKAGE}/config`)),
		catch: (cause) => new CoreTypesError({ file: CORE_PACKAGE, detail: globalThis.String(cause) }),
	});
	const root = yield* path
		.fromFileUrl(url)
		.pipe(Effect.mapError((error) => new CoreTypesError({ file: url.href, detail: causeDetail(error) })));
	const file = path.join(root, "package.json");
	const manifest = yield* decodeUnknownEffect(CoreManifest)(yield* readJsonc(file)).pipe(
		Effect.mapError((error) => new CoreTypesError({ file, detail: error.message })),
	);
	const entries = exportsOf(manifest.exports);
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

	const tsconfig = path.join(folder, "tsconfig.json");
	if (
		!(yield* fs
			.exists(tsconfig)
			.pipe(Effect.mapError((error) => new CoreTypesError({ file: tsconfig, detail: error.message }))))
	)
		return yield* Effect.void;
	if (at(yield* readJsonc(tsconfig), "extends") !== `./${LOCAL_TSCONFIG}`) return yield* Effect.void;
	const target = path.join(folder, LOCAL_TSCONFIG);
	const failed = (error: { readonly message: string }) =>
		new CoreTypesError({ file: target, detail: error.message });
	const compilerOptions = {
		...(hasNodeTypes(folder) ? { types: ["node"] } : {}),
		erasableSyntaxOnly: true,
		verbatimModuleSyntax: true,
		paths: yield* coreTypePaths(),
	};
	const text = `${JSON.stringify({ compilerOptions }, null, "\t")}\n`;
	if (Option.getOrUndefined(yield* fs.readFileString(target).pipe(Effect.option)) === text)
		return yield* Effect.void;
	yield* fs.makeDirectory(path.dirname(target), { recursive: true }).pipe(Effect.mapError(failed));
	return yield* fs.writeFileString(target, text).pipe(Effect.mapError(failed));
});

export const refreshCoreTypes = (folder: string) =>
	writeCoreTypes(folder).pipe(
		Effect.catch((error) =>
			Console.error(`[WARN] config: cannot refresh the core types from ${error.file}: ${error.detail}`),
		),
	);
