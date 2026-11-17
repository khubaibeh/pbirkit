import { pathToFileURL } from "node:url";

import { Console, Effect, FileSystem, Path } from "effect";
import { Command, Flag } from "effect/cli";
import { decodeUnknownEffect, is } from "effect/Schema";

import { buildFiles } from "@pbirkit/core/build";
import { checkConfig } from "@pbirkit/core/check";
import { Config } from "@pbirkit/core/config";

class BuildError extends Error {}

const fail = (message: string) => Effect.fail(new BuildError(`[ERROR] build: ${message}`));

const OWNED: ReadonlySet<string> = new Set(["page.json", "visual.json", "bookmarks.json"]);

const owned = (file: string): boolean => OWNED.has(file) || file.endsWith(".bookmark.json");

const parents = (path: Path.Path, file: string, root: string): ReadonlyArray<string> => {
	const folder = path.dirname(file);
	return folder === root || !folder.startsWith(root) ? [] : [folder, ...parents(path, folder, root)];
};

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
		const { errors, warnings } = checkConfig(input);
		if (warnings.length > 0) yield* Console.error(warnings.join("\n"));
		if (errors.length > 0) return yield* Effect.fail(new BuildError(errors.join("\n")));
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
			const written = new Set<string>();
			for (const { path: relative, content } of files) {
				const target = path.join(out, relative);
				yield* fs.makeDirectory(path.dirname(target), { recursive: true });
				yield* fs.writeFileString(target, content);
				written.add(target);
			}
			const definition = path.join(out, `${config.name}.Report`, "definition");
			const stale = (yield* fs.exists(definition))
				? (yield* fs.readDirectory(definition, { recursive: true }))
						.map((entry) => path.join(definition, entry))
						.filter((entry) => owned(path.basename(entry)) && !written.has(entry))
				: [];
			for (const entry of stale) yield* fs.remove(entry);
			const folders = [...new Set(stale.flatMap((entry) => parents(path, entry, definition)))].toSorted(
				(a, b) => b.length - a.length,
			);
			for (const folder of folders) {
				if ((yield* fs.readDirectory(folder)).length === 0) yield* fs.remove(folder, { recursive: true });
			}
			yield* Console.log(
				`build: wrote ${files.length} files to ${out}${stale.length > 0 ? `, removed ${stale.length} stale files` : ""}`,
			);
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
