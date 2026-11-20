import { Console, Effect, HashMap, Option, Path } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { loadConfig } from "../build/config.ts";
import { fromCwd } from "../build/paths.ts";
import { fileKey } from "../build/tree.ts";
import { compareProject } from "../diff/compare.ts";
import { renderComparison } from "../diff/render.ts";
import { NO_SELECTORS } from "../diff/scope.ts";
import { errorMessage, exitWith } from "../messages.ts";
import { ProjectSourceError } from "../pbip/errors.ts";
import { findProject } from "../pbip/project.ts";
import type { Project } from "../pbip/project.ts";
import { indexTree } from "../pbip/tree.ts";
import { settleConfig } from "./draft.ts";
import { diffCommand, verifiedMessage, writtenMessage } from "./messages.ts";
import { CONFIG_FILE, importFiles, supportFiles } from "./modules.ts";
import { checkOutput, coreTypePaths, writeImport } from "./output.ts";

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
}: Command.Command.Config.Infer<typeof flags>) {
	const path = yield* Path.Path;

	const project = yield* findProject(source);
	yield* requireFiles(project);
	const { config, fallbacks } = settleConfig(project, indexTree(project.name, project.report, project.tree));
	const out = path.resolve(Option.getOrElse(outFlag, () => `${project.name}.pbirkit`));
	const files = importFiles(project, config);
	yield* checkOutput(out, project, files, force);
	yield* writeImport(out, files, supportFiles(yield* coreTypePaths()));

	const configFile = path.join(out, CONFIG_FILE);
	yield* Console.log(writtenMessage(fromCwd(path, configFile), config, fallbacks));
	const loaded = yield* loadConfig(configFile, false);
	const comparison = yield* compareProject(loaded.config, project.root, "bytes", NO_SELECTORS);
	if (comparison.differences.length > 0) {
		yield* Console.log(renderComparison(comparison));
		process.exitCode = 1;
		return;
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
