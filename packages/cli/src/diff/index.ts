import { Console, Effect, HashMap, Option, Path } from "effect";
import { Command, Flag } from "effect/cli";

import { buildFiles, desktopOwnedPaths, modelFolderOf, reportFolder } from "@pbirkit/core/build";
import { diffTrees } from "@pbirkit/core/diff";

import { loadConfig } from "../build/config.ts";
import { buildTree } from "../build/outputs.ts";
import { DEFAULT_OUT, fromCwd } from "../build/paths.ts";
import { isOwned, projectEntries, readTree } from "../build/tree.ts";
import { TargetMissingError } from "./errors.ts";
import type { DiffError } from "./errors.ts";
import { errorMessage } from "./messages.ts";
import { fileTreeOf, renderDiff } from "./render.ts";
import { scopeTrees } from "./scope.ts";

const flags = {
	config: Flag.File("config", { mustExist: true }).pipe(
		Flag.withAlias("c"),
		Flag.withDefault("pbirkit.config.ts"),
		Flag.withDescription("Config file to build in memory"),
	),
	target: Flag.String("target").pipe(
		Flag.optional,
		Flag.withMetavar("DIR"),
		Flag.withDescription("Folder to compare, relative to where you run the command (defaults to config out)"),
	),
	bytes: Flag.Boolean("bytes").pipe(
		Flag.withDefault(false),
		Flag.withDescription("Compare files byte-for-byte"),
	),
	page: Flag.String("page").pipe(
		Flag.withMetavar("NAME"),
		Flag.withDescription("Select a page (repeatable)"),
		Flag.atLeast(0),
	),
	visual: Flag.String("visual").pipe(
		Flag.withMetavar("NAME|PAGE/NAME"),
		Flag.withDescription("Select a visual (repeatable)"),
		Flag.atLeast(0),
	),
	bookmark: Flag.String("bookmark").pipe(
		Flag.withMetavar("NAME"),
		Flag.withDescription("Select a bookmark (repeatable)"),
		Flag.atLeast(0),
	),
	theme: Flag.String("theme").pipe(
		Flag.withMetavar("NAME"),
		Flag.withDescription("Select a theme resource (repeatable)"),
		Flag.atLeast(0),
	),
};

const runDiff = Effect.fnUntraced(function* ({
	config: configFlag,
	target,
	bytes,
	...selectors
}: Command.Command.Config.Infer<typeof flags>) {
	const path = yield* Path.Path;
	const configFile = path.resolve(configFlag);
	const config = yield* loadConfig(configFile);
	const folder = Option.match(target, {
		onNone: () => path.resolve(path.dirname(configFile), config.out ?? DEFAULT_OUT),
		onSome: (dir) => path.resolve(dir),
	});
	const owned = [
		...projectEntries(
			`${config.name}.pbip`,
			reportFolder(config),
			Option.getOrUndefined(modelFolderOf(config)),
		),
		".gitignore",
	];
	const build = yield* buildTree(buildFiles(config), desktopOwnedPaths(config));
	const project = yield* readTree(folder, owned);
	if (Option.isNone(project)) return yield* new TargetMissingError({ folder: fromCwd(path, folder) });

	const { expected, actual } = yield* scopeTrees(
		fileTreeOf(HashMap.filter(build, (file) => isOwned(owned, file.path))),
		fileTreeOf(project.value),
		selectors,
	);
	const differences = diffTrees(expected, actual, { mode: bytes ? "bytes" : "semantic", maxPointers: 5 });
	if (differences.length > 0) process.exitCode = 1;
	return yield* Console.log(renderDiff(differences));
});

const reportError = (error: DiffError) =>
	Effect.andThen(
		Console.error(errorMessage(error)),
		Effect.sync(() => {
			process.exitCode = 1;
		}),
	);

export const diff = Command.make("diff", flags, (input) =>
	runDiff(input).pipe(Effect.catch(reportError)),
).pipe(Command.withDescription("Compare the configured build with a PBIP project"));
