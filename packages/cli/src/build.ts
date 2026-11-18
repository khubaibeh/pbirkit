import { fileURLToPath, pathToFileURL } from "node:url";

import { Console, Effect, FileSystem, Path } from "effect";
import { Command, Flag } from "effect/cli";
import { decodeUnknownEffect, is } from "effect/Schema";

import { buildFiles, ownedFolders } from "@pbirkit/core/build";
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
			const copy = (source: URL, relative: string, target: string) =>
				fs
					.copyFile(fileURLToPath(source), target)
					.pipe(
						Effect.mapError(
							(cause) =>
								new BuildError(`[ERROR] build: cannot copy ${source.href} to ${relative}: ${cause.message}`),
						),
					);
			for (const item of files) {
				const target = path.join(out, item.path);
				if ("sourceFolder" in item) {
					const root = fileURLToPath(item.sourceFolder);
					const entries = yield* fs
						.readDirectory(root, { recursive: true })
						.pipe(
							Effect.mapError(
								(cause) =>
									new BuildError(`[ERROR] build: cannot read ${root} for ${item.path}: ${cause.message}`),
							),
						);
					for (const entry of entries) {
						if ((yield* fs.stat(path.join(root, entry))).type !== "File") continue;
						const destination = path.join(target, entry);
						yield* fs.makeDirectory(path.dirname(destination), { recursive: true });
						yield* copy(pathToFileURL(path.join(root, entry)), path.join(item.path, entry), destination);
						written.add(destination);
					}
					continue;
				}
				yield* fs.makeDirectory(path.dirname(target), { recursive: true });
				if ("content" in item) yield* fs.writeFileString(target, item.content);
				else yield* copy(item.source, item.path, target);
				written.add(target);
			}
			const scopes = [
				{ root: path.join(out, `${config.name}.Report`, "definition"), isOwned: owned },
				...ownedFolders(config).map((folder) => ({ root: path.join(out, folder), isOwned: () => true })),
			];
			const stale: Array<string> = [];
			for (const { root, isOwned } of scopes) {
				if (!(yield* fs.exists(root))) continue;
				for (const entry of yield* fs.readDirectory(root, { recursive: true })) {
					const target = path.join(root, entry);
					if (
						isOwned(path.basename(target)) &&
						!written.has(target) &&
						(yield* fs.stat(target)).type === "File"
					)
						stale.push(target);
				}
			}
			for (const entry of stale) yield* fs.remove(entry);
			const folders = [...new Set(stale.flatMap((entry) => parents(path, entry, out)))].toSorted(
				(a, b) => b.length - a.length,
			);
			for (const folder of folders) {
				if ((yield* fs.readDirectory(folder)).length === 0) yield* fs.remove(folder, { recursive: true });
			}
			yield* Console.log(
				`build: wrote ${written.size} files to ${out}${stale.length > 0 ? `, removed ${stale.length} stale files` : ""}`,
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
