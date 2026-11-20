import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

import { Console, Effect, Predicate } from "effect";
import { decodeUnknownEffect, is } from "effect/Schema";

import { checkConfig } from "@pbirkit/core/check";
import { Config } from "@pbirkit/core/config";

import { ConfigCheckError, ConfigLoadError, ConfigShapeError } from "./errors.ts";

const importDefault = Effect.fnUntraced(function* (file: string) {
	const module: unknown = yield* Effect.acquireUseRelease(
		Effect.sync(() =>
			registerHooks({
				resolve(specifier, context, nextResolve) {
					try {
						return nextResolve(specifier, context);
					} catch (cause) {
						if (
							(specifier === "@pbirkit/core" || specifier.startsWith("@pbirkit/core/")) &&
							Predicate.hasProperty(cause, "code") &&
							cause.code === "ERR_MODULE_NOT_FOUND"
						) {
							return nextResolve(specifier, { ...context, parentURL: import.meta.url });
						}
						throw cause;
					}
				},
			}),
		),
		() =>
			Effect.tryPromise({
				try: () => import(pathToFileURL(file).href),
				catch: (cause) => new ConfigLoadError({ file, detail: String(cause) }),
			}),
		(hooks) =>
			Effect.sync(() => {
				hooks.deregister();
			}),
	);

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

export const readConfig = Effect.fnUntraced(function* (file: string) {
	return yield* asConfig(file, yield* importDefault(file));
});

export const loadConfig = Effect.fnUntraced(function* (file: string) {
	const config = yield* readConfig(file);
	const { errors, warnings } = checkConfig(config);

	if (warnings.length > 0) yield* Console.error(warnings.join("\n"));

	if (errors.length > 0) return yield* new ConfigCheckError({ issues: errors });

	return config;
});
