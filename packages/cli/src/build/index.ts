import { Console, Effect, HashMap, Option, Path } from "effect";
import { Command, Flag } from "effect/cli";

import { buildFiles, modelCache, ownedFolders, reportDefinitionFolder } from "@pbirkit/core/build";
import type { Config } from "@pbirkit/core/config";

import { applyPlan } from "./apply.ts";
import { keepCache, restoreCache } from "./cache.ts";
import { loadConfig } from "./config.ts";
import { ConflictError } from "./errors.ts";
import type { BuildError } from "./errors.ts";
import { errorMessage, summary } from "./messages.ts";
import { readOutputs } from "./outputs.ts";
import { fromCwd, projectPaths } from "./paths.ts";
import { conflictsOf, planBuild } from "./plan.ts";
import type { Scope } from "./plan.ts";
import { loadLastHashes, saveState } from "./state.ts";

const DEFINITION_FILES: ReadonlySet<string> = new Set(["page.json", "visual.json", "bookmarks.json"]);

const isDefinitionFile = (file: string): boolean =>
	DEFINITION_FILES.has(file) || file.endsWith(".bookmark.json");

const scopesOf = (config: Config): ReadonlyArray<Scope> => [
	{ root: reportDefinitionFolder(config), isOwned: isDefinitionFile },
	...ownedFolders(config).map((root) => ({ root, isOwned: () => true })),
];

const flags = {
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
	force: Flag.Boolean("force").pipe(
		Flag.withDefault(false),
		Flag.withDescription("Overwrite or delete files that changed outside the build"),
	),
};

const runBuild = Effect.fnUntraced(function* ({
	config: configFlag,
	out: outFlag,
	force,
}: Command.Command.Config.Infer<typeof flags>) {
	const path = yield* Path.Path;
	const paths = projectPaths(path, configFlag, outFlag);

	const config = yield* loadConfig(paths.configFile);
	const outputs = yield* readOutputs(buildFiles(config));

	const cache = modelCache(config);
	if (Option.isSome(cache)) yield* keepCache(paths, cache.value);

	const last = yield* loadLastHashes(paths);
	const plan = yield* planBuild({ out: paths.out, outputs, last, scopes: scopesOf(config), force });

	const conflicts = conflictsOf(plan);
	if (conflicts.length > 0) {
		return yield* new ConflictError({
			out: fromCwd(path, paths.out),
			lastBuild: HashMap.isEmpty(last) ? Option.none() : Option.some(fromCwd(path, paths.lastBuild)),
			conflicts,
		});
	}

	yield* applyPlan(paths.out, plan);
	const cacheOutcome = yield* Effect.transposeOption(
		Option.map(cache, (found) => restoreCache(paths, found)),
	);

	yield* saveState(paths, outputs);
	return yield* Console.log(summary(paths.out, plan, cacheOutcome));
});

const reportError = (error: BuildError) =>
	Effect.andThen(
		Console.error(errorMessage(error)),
		Effect.sync(() => {
			process.exitCode = 1;
		}),
	);

export const build = Command.make("build", flags, (input) =>
	runBuild(input).pipe(
		Effect.catchTag(
			[
				"ConfigLoadError",
				"ConfigShapeError",
				"ConfigCheckError",
				"SourceReadError",
				"ManifestError",
				"ConflictError",
			],
			reportError,
		),
	),
).pipe(Command.withDescription("Write the PBIP project that Power BI Desktop opens"));
