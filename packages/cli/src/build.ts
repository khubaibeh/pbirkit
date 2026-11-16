import { pathToFileURL } from "node:url";

import { Console, Effect, FileSystem, Path } from "effect";
import { Command, Flag } from "effect/cli";
import { decodeUnknownEffect, is } from "effect/Schema";

import { buildFiles } from "@pbirkit/core/build";
import { checkConfig } from "@pbirkit/core/check";
import { Config } from "@pbirkit/core/config";

class BuildError extends Error {}

const fail = (message: string) => Effect.fail(new BuildError(`[ERROR] build: ${message}`));

const loadConfig = (file: string) =>
	Effect.gen(function* () {
		const module: unknown = yield* Effect.tryPromise({
			try: () => import(pathToFileURL(file).href),
			catch: (cause) => new BuildError(`[ERROR] build: cannot load ${file}: ${String(cause)}`),
		});
		const input: unknown =
			typeof module === "object" && module !== null ? Reflect.get(module, "default") : undefined;
		yield* decodeUnknownEffect(Config)(input, { onExcessProperty: "error" }).pipe(
			Effect.mapError(
				(error) => new BuildError(`[ERROR] build: ${file} is not a valid config\n${error.message}`),
			),
		);
		if (!is(Config)(input)) return yield* fail(`${file} is not a valid config`);
		const issues = checkConfig(input);
		if (issues.length > 0) return yield* Effect.fail(new BuildError(issues.join("\n")));
		return input;
	});

export const build = Command.make(
	"build",
	{
		config: Flag.File("config", { mustExist: true }).pipe(
			Flag.withAlias("c"),
			Flag.withDefault("pbirkit.config.ts"),
			Flag.withDescription("Config file to build"),
		),
		out: Flag.Directory("out").pipe(
			Flag.withAlias("o"),
			Flag.withDefault("dist"),
			Flag.withDescription("Folder to write the PBIP project to, relative to the config file"),
		),
	},
	({ config: configFlag, out: outFlag }) =>
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const file = path.resolve(configFlag);
			const out = path.resolve(path.dirname(file), outFlag);
			const config = yield* loadConfig(file);
			const files = buildFiles(config);
			yield* fs.remove(path.join(out, `${config.name}.Report`, "definition", "pages"), {
				recursive: true,
				force: true,
			});
			for (const { path: relative, content } of files) {
				const target = path.join(out, relative);
				yield* fs.makeDirectory(path.dirname(target), { recursive: true });
				yield* fs.writeFileString(target, content);
			}
			yield* Console.log(`build: wrote ${files.length} files to ${out}`);
		}).pipe(
			Effect.catchIf(
				(error) => error instanceof BuildError,
				(error) =>
					Effect.andThen(
						Console.error(error.message),
						Effect.sync(() => (process.exitCode = 1)),
					),
			),
		),
).pipe(Command.withDescription("Write the PBIP project that Power BI Desktop opens"));
