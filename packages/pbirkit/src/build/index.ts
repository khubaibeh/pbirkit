import { Console, Effect, HashMap, Option, Path } from "effect";
import { Command, Flag } from "effect/cli";

import { buildFiles, desktopOwnedPaths, modelCache, modelFolderOf, reportFolder } from "@pbirkit/core/build";

import { errorMessage, exitWith } from "../messages.ts";
import { applyChanges } from "./apply.ts";
import { checkSeed, keepCache, restoreCache } from "./cache.ts";
import { loadConfig } from "./config.ts";
import { requireDesktopClosed, requireInside } from "./discard.ts";
import { ConflictError, DiscardError } from "./errors.ts";
import { requireGitRepo } from "./git.ts";
import { changedUnder, changesBetween, discardTrees, mergeTrees, pendingPorts } from "./merge.ts";
import { summary } from "./messages.ts";
import { buildTree } from "./outputs.ts";
import { DEFAULT_OUT, checkOut, fromCwd, projectPaths, snapshotFolder } from "./paths.ts";
import {
	commitSnapshot,
	loadState,
	markPending,
	prepareState,
	saveSnapshot,
	snapshotId,
} from "./snapshot.ts";
import type { BuildState } from "./snapshot.ts";
import { modelLosses } from "./tmdl.ts";
import { clearFolder, projectEntries, readTree } from "./tree.ts";

const flags = {
	config: Flag.File("config", { mustExist: true }).pipe(
		Flag.withAlias("c"),
		Flag.withDefault("pbirkit.config.ts"),
		Flag.withDescription("Config file to build"),
	),
	out: Flag.String("out").pipe(
		Flag.withAlias("o"),
		Flag.optional,
		Flag.withDescription("Write a scratch build to this folder, relative to where you run the command"),
	),
	prefer: Flag.Literals("prefer", ["src", "desktop"]).pipe(
		Flag.optional,
		Flag.withDescription("Side that wins when src and Desktop changed the same lines"),
	),
	discardDesktop: Flag.Boolean("discard-desktop").pipe(
		Flag.withDefault(false),
		Flag.withDescription(
			"Throw away every Desktop change and write the build from src. Close Desktop first, without saving",
		),
	),
};

const runBuild = Effect.fnUntraced(function* ({
	config: configFlag,
	out: outFlag,
	prefer,
	discardDesktop,
}: Command.Command.Config.Infer<typeof flags>) {
	const path = yield* Path.Path;

	if (discardDesktop && Option.isSome(prefer)) {
		return yield* new DiscardError({ detail: "--discard-desktop and --prefer do not go together. Pick one" });
	}

	const configFile = path.resolve(configFlag);
	const { config } = yield* loadConfig(configFile);
	const configOut = Option.getOrElse(Option.fromNullishOr(config.out), () => DEFAULT_OUT);
	const paths = projectPaths(path, configFile, configOut, outFlag);
	yield* checkOut(paths);
	yield* requireGitRepo(paths.root);

	const owned = desktopOwnedPaths(config);
	const next = yield* buildTree(buildFiles(config), owned);
	const project = yield* readTree(paths.out);
	const cache = modelCache(config);
	if (Option.isSome(cache)) yield* checkSeed(cache.value);

	if (paths.recorded) {
		yield* prepareState(paths);
		if (Option.isSome(cache)) yield* keepCache(paths, cache.value);
	}

	const empty: BuildState = { snapshot: Option.none(), unfinished: [] };
	const { snapshot, unfinished } = paths.recorded ? yield* loadState(paths) : empty;
	const shown = (id: string) => fromCwd(path, snapshotFolder(path, paths, id));

	const checked = discardDesktop
		? yield* requireDesktopClosed(
				path.join(paths.out, reportFolder(config)),
				path.join(paths.out, `${config.name}.pbip`),
				fromCwd(path, path.join(paths.out, `${config.name}.pbip`)),
			)
		: true;
	const scope = projectEntries(
		`${config.name}.pbip`,
		reportFolder(config),
		Option.getOrUndefined(modelFolderOf(config)),
	);
	const { result, conflicts, merged, discarded } = discardDesktop
		? {
				merged: [],
				...discardTrees({
					snapshot: Option.map(snapshot, (found) => found.tree),
					next,
					project,
					owned,
					scope,
				}),
			}
		: {
				discarded: [],
				...mergeTrees({
					snapshot: Option.map(snapshot, (found) => found.tree),
					unfinished: unfinished.map((found) => found.tree),
					next,
					project,
					prefer,
					owned,
				}),
			};

	if (conflicts.length > 0) {
		return yield* new ConflictError({
			out: fromCwd(path, paths.out),
			snapshot: Option.map(snapshot, (found) => shown(found.id)),
			conflicts,
		});
	}

	const changes = changesBetween(project, result);
	if (discardDesktop) yield* requireInside(paths.out, fromCwd(path, paths.out), changes);

	const id = snapshotId(next);
	if (paths.recorded) {
		yield* saveSnapshot(paths, { id, tree: next });
		yield* markPending(paths, id);
	}

	yield* clearFolder(paths.staging);
	yield* applyChanges(paths.out, paths.staging, changes);

	const cacheOutcome = yield* Effect.transposeOption(
		Option.map(cache, (found) => restoreCache(paths, found)),
	);

	if (paths.recorded) yield* commitSnapshot(paths, id);
	yield* clearFolder(paths.staging);

	const modelChanged =
		Option.exists(cacheOutcome, (outcome) => outcome !== "missing") &&
		Option.exists(Option.all([snapshot, modelFolderOf(config)]), ([found, folder]) =>
			changedUnder(folder, found.tree, next),
		);

	return yield* Console.log(
		summary({
			out: fromCwd(path, paths.out),
			recorded: paths.recorded,
			changes,
			total: HashMap.size(result),
			merged,
			cache: cacheOutcome,
			modelChanged,
			pending: pendingPorts(next, result, owned, scope),
			losses: modelLosses(next, result, owned),
			discarded,
			desktopChecked: checked,
			snapshot: shown(id),
		}),
	);
});

export const build = Command.make("build", flags, (input) =>
	runBuild(input).pipe(Effect.catch((error) => exitWith(1)(errorMessage("build")(error)))),
).pipe(Command.withDescription("Build the PBIP project and merge it with changes made in Desktop"));
