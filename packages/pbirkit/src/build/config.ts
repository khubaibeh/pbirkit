import type { ResolveHookSync } from "node:module";

import { Console, Effect, Path, Predicate } from "effect";
import { decodeUnknownEffect, is } from "effect/Schema";

import { buildFiles } from "@pbirkit/core/build";
import { checkConfig } from "@pbirkit/core/check";
import { Config } from "@pbirkit/core/config";

import { CORE_PACKAGE } from "../core-package.ts";
import { refreshCoreTypes } from "./core-types.ts";
import {
	causeDetail,
	ConfigBuildError,
	ConfigCheckError,
	ConfigLoadError,
	ConfigShapeError,
} from "./errors.ts";

const isCore = (specifier: string): boolean =>
	specifier === CORE_PACKAGE || specifier.startsWith(`${CORE_PACKAGE}/`);

export const resolveCoreFromCli: ResolveHookSync = (specifier, context, nextResolve) =>
	nextResolve(specifier, isCore(specifier) ? { ...context, parentURL: import.meta.url } : context);

const STRIP_ERROR = "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX";

const loadDetail = (cause: unknown): string => {
	if (!(cause instanceof Error) || !Predicate.hasProperty(cause, "code") || cause.code !== STRIP_ERROR)
		return String(cause);
	const first = cause.stack?.split("\n", 1)[0] ?? "";
	const location = first === "" || first.includes(STRIP_ERROR) ? "" : `${first}: `;
	return `${location}${cause.message}. Node strips the TS types and does not transform them, so enum, namespace and parameter properties fail. Rewrite them as plain code; tsc lists each one.`;
};

const importDefault = Effect.fnUntraced(function* (file: string) {
	const path = yield* Path.Path;

	const url = yield* path
		.toFileUrl(file)
		.pipe(Effect.mapError((error) => new ConfigLoadError({ file, detail: causeDetail(error) })));
	const module: unknown = yield* Effect.tryPromise({
		try: () => import(url.href),
		catch: (cause) => new ConfigLoadError({ file, detail: loadDetail(cause) }),
	});

	if (!Predicate.hasProperty(module, "default")) {
		return yield* new ConfigShapeError({ file, detail: "it has no default export" });
	}

	return module.default;
});

const asConfig = Effect.fnUntraced(function* (file: string, input: unknown) {
	yield* decodeUnknownEffect(Config)(input, { onExcessProperty: "error" }).pipe(
		Effect.mapError((error) => new ConfigShapeError({ file, detail: error.message })),
	);

	if (!is(Config)(input))
		return yield* new ConfigShapeError({ file, detail: "it does not match the config schema" });

	return input;
});

export const configFiles = (config: Config) =>
	Effect.try({
		try: () => buildFiles(config),
		catch: (cause) => new ConfigBuildError({ detail: String(cause) }),
	});

export const readConfig = Effect.fnUntraced(function* (file: string) {
	const path = yield* Path.Path;

	yield* refreshCoreTypes(path.dirname(file));
	return yield* asConfig(file, yield* importDefault(file));
});

export const loadConfig = Effect.fnUntraced(function* (file: string, showWarnings: boolean = true) {
	const config = yield* readConfig(file);
	const { errors, warnings } = checkConfig(config);

	if (showWarnings && warnings.length > 0) yield* Console.error(warnings.join("\n"));

	if (errors.length > 0) return yield* new ConfigCheckError({ issues: errors });

	return { config, warnings };
});
