import { Console, Effect, HashMap, Option, Path } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { loadConfig } from "../build/config.ts";
import { ConfigBuildError } from "../build/errors.ts";
import { fromCwd } from "../build/paths.ts";
import { fileKey } from "../build/tree.ts";
import { compareProject } from "../diff/compare.ts";
import { renderComparison } from "../diff/render.ts";
import { NO_SELECTORS } from "../diff/scope.ts";
import { Layout } from "../layout.ts";
import { errorMessage, exitWith, setExitCode } from "../messages.ts";
import { ProjectSourceError } from "../pbip/errors.ts";
import { findProject } from "../pbip/project.ts";
import type { Project } from "../pbip/project.ts";
import { indexTree } from "../pbip/tree.ts";
import { settleConfig } from "./draft.ts";
import { diffCommand, verifiedMessage, writtenMessage } from "./messages.ts";
import { importFiles, supportFiles } from "./modules.ts";
import { checkOutput, writeImport } from "./output.ts";

const flags = {
	source: Argument.String("source").pipe(
		Argument.withDefault("."),
		Argument.withDescription("PBIP project folder or .pbip file"),
	),
	out: Flag.String("out").pipe(
		Flag.withAlias("o"),
		Flag.optional,
		Flag.withDescription("Folder for the imported config, relative to where you run the command"),
	),
	force: Flag.Boolean("force").pipe(
		Flag.withDefault(false),
		Flag.withDescription("Replace the files that an earlier import wrote to the output folder"),
	),
	idiomatic: Flag.Boolean("idiomatic").pipe(
		Flag.withDefault(false),
		Flag.withDescription("Write pbirkit helper calls such as col and solid where they rebuild the same JSON"),
	),
	grouped: Flag.Boolean("grouped").pipe(
		Flag.withDefault(false),
		Flag.withDescription(
			"Write one module per visual, with groups as folders, instead of one module per page",
		),
	),
};

const REPORT_FILES = [
	".platform",
	"definition.pbir",
	"definition/report.json",
	"definition/version.json",
	"definition/pages/pages.json",
];

const MODEL_FILES = [".platform", "definition.pbism"];

const requireFiles = Effect.fnUntraced(function* (project: Project) {
	const path = yield* Path.Path;

	const required = [
		...REPORT_FILES.map((file) => `${project.report}/${file}`),
		...(project.model === undefined ? [] : MODEL_FILES.map((file) => `${project.model}/${file}`)),
	];
	const missing = required.find((file) => !HashMap.has(project.tree, fileKey(file)));
	if (missing !== undefined)
		return yield* new ProjectSourceError({
			path: path.join(project.root, missing),
			detail: "the file is missing",
		});
	return yield* Effect.void;
});

const runImport = Effect.fnUntraced(function* ({
	source,
	out: outFlag,
	force,
	idiomatic,
	grouped,
}: Command.Command.Config.Infer<typeof flags>) {
	const path = yield* Path.Path;

	const project = yield* findProject(source);
	yield* requireFiles(project);
	const index = indexTree(project.name, project.report, project.tree);
	const { config, fallbacks } = yield* Effect.try({
		try: () => settleConfig(project, index),
		catch: (cause) => new ConfigBuildError({ detail: String(cause) }),
	});
	const out = path.resolve(Option.getOrElse(outFlag, () => `${project.name}.pbirkit`));
	const files = importFiles(project, index, config, fallbacks, idiomatic, grouped);
	yield* checkOutput(out, project, files, force);
	yield* writeImport(out, files, supportFiles());

	const configFile = path.join(out, Layout.config);
	yield* Console.log(
		writtenMessage(
			fromCwd(path, configFile),
			fromCwd(path, path.join(out, Layout.report)),
			config,
			fallbacks,
		),
	);
	const loaded = yield* loadConfig(configFile, false);
	const comparison = yield* compareProject(loaded.config, project.root, "text", NO_SELECTORS);
	if (comparison.differences.length > 0) {
		yield* Console.log(renderComparison(comparison));
		return yield* setExitCode(1);
	}
	yield* Console.log(
		verifiedMessage(
			comparison,
			loaded.warnings.length,
			diffCommand(fromCwd(path, configFile), fromCwd(path, project.root)),
		),
	);
});

export const importCommand = Command.make("import", flags, (input) =>
	runImport(input).pipe(Effect.catch((error) => exitWith(2)(errorMessage("import")(error)))),
).pipe(Command.withDescription("Convert an existing PBIP project to a pbirkit config"));
