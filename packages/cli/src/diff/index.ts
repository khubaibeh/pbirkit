import { Console, Effect, Option, Path } from "effect";
import { Command, Flag } from "effect/cli";

import { loadConfig } from "../build/config.ts";
import { DEFAULT_OUT } from "../build/paths.ts";
import { errorMessage, exitWith } from "../messages.ts";
import { compareProject } from "./compare.ts";
import { renderComparison } from "./render.ts";

const flags = {
	config: Flag.String("config").pipe(
		Flag.withAlias("c"),
		Flag.withDefault("pbirkit.config.ts"),
		Flag.withMetavar("FILE"),
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
	warnings: Flag.Boolean("warnings").pipe(
		Flag.withDefault(false),
		Flag.withDescription("Show config check warnings"),
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
	warnings,
	...selectors
}: Command.Command.Config.Infer<typeof flags>) {
	const path = yield* Path.Path;
	const configFile = path.resolve(configFlag);
	const { config } = yield* loadConfig(configFile, warnings);
	const folder = Option.match(target, {
		onNone: () => path.resolve(path.dirname(configFile), config.out ?? DEFAULT_OUT),
		onSome: (dir) => path.resolve(dir),
	});
	const comparison = yield* compareProject(config, folder, bytes ? "bytes" : "semantic", selectors);
	if (comparison.differences.length > 0) process.exitCode = 1;
	return yield* Console.log(renderComparison(comparison));
});

export const diff = Command.make("diff", flags, (input) =>
	runDiff(input).pipe(Effect.catch((error) => exitWith(2)(errorMessage("diff")(error)))),
).pipe(Command.withDescription("Compare the configured build with a PBIP project"));
