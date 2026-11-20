import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

import { Console, Effect, FileSystem, Option, Path, Result } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { buildFiles, desktopOwnedPaths } from "@pbirkit/core/build";
import { diffTrees } from "@pbirkit/core/diff";

import { loadConfig } from "../build/config.ts";
import { onFileSystem, PathClashError } from "../build/errors.ts";
import { buildTree } from "../build/outputs.ts";
import { fromCwd } from "../build/paths.ts";
import { clearFolder, pathClashes, treeOf, writeTree } from "../build/tree.ts";
import { fileTreeOf, renderDiff } from "../diff/render.ts";
import { errorMessage, summary, verificationErrorMessage } from "./messages.ts";
import { importModel } from "./model.ts";
import { CONFIG_FILE, ImportOutput } from "./output.ts";
import { importReport } from "./report.ts";
import { checkOutput, findProject, readArtifact, readProjectTree } from "./source.ts";
import type { Project } from "./source.ts";

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
		Flag.withDescription("Replace generated files and model asset folders in a non-empty output folder"),
	),
};

const fail = Effect.sync(() => {
	process.exitCode = 1;
});

const verify = Effect.fnUntraced(function* (file: string, project: Project) {
	const config = yield* Effect.acquireUseRelease(
		Effect.sync(() => {
			const generatedConfig = pathToFileURL(file).href;
			return registerHooks({
				resolve: (specifier, context, nextResolve) =>
					specifier === "@pbirkit/core/config" && context.parentURL === generatedConfig
						? nextResolve(specifier, { ...context, parentURL: import.meta.url })
						: nextResolve(specifier, context),
			});
		}),
		() => loadConfig(file),
		(hooks) =>
			Effect.sync(() => {
				hooks.deregister();
			}),
	);
	const built = new Map(fileTreeOf(yield* buildTree(buildFiles(config), desktopOwnedPaths(config))));
	built.delete(".gitignore");
	const source = fileTreeOf(yield* readProjectTree(project));
	const differences = diffTrees(built, source, { mode: "semantic", maxPointers: 5 });
	const differentPaths = new Set(differences.map(({ path }) => path));
	const verified = [...source.keys()].filter((path) => !differentPaths.has(path)).length;

	return { differences, verified };
});

const runImport = Effect.fnUntraced(function* ({
	source,
	out: outFlag,
	force,
}: Command.Command.Config.Infer<typeof flags>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const project = yield* findProject(source);
	const out = path.resolve(Option.getOrElse(outFlag, () => `${project.name}.pbirkit`));
	yield* checkOutput(out, project, force);

	const output = new ImportOutput();
	const { report, registration } = yield* importReport(
		project,
		yield* readArtifact(project.root, project.report),
		output,
	);
	const model =
		project.model === undefined
			? undefined
			: yield* importModel(project.model, yield* readArtifact(project.root, project.model), output);

	if (model === undefined && project.localReference) {
		output.fallback(
			"Model reference",
			"Kept the reference because the local model could not be found inside the project",
		);
	}
	output.module(
		CONFIG_FILE,
		{ name: project.name, pbip: project.pbip, report, ...(model === undefined ? {} : { model }) },
		registration,
	);

	const clashes = pathClashes(output.files);
	if (clashes.length > 0) return yield* new PathClashError({ folder: out, pairs: clashes });

	if (force) {
		for (const folder of output.directories) yield* clearFolder(path.join(out, folder));
	}
	yield* writeTree(out, treeOf(output.files));
	for (const dir of output.directories) {
		const target = path.join(out, dir);
		yield* fs.makeDirectory(target, { recursive: true }).pipe(onFileSystem("create", target));
	}

	const config = path.join(out, CONFIG_FILE);
	const result = yield* Effect.result(verify(config, project));
	yield* Console.log(
		summary(fromCwd(path, config), Result.isSuccess(result) ? result.success.verified : 0, output.fallbacks),
	);

	if (Result.isFailure(result)) {
		yield* Console.error(verificationErrorMessage(result.failure));
		return yield* fail;
	}

	if (result.success.differences.length > 0) {
		yield* Console.log(renderDiff(result.success.differences));
		return yield* fail;
	}

	return yield* Effect.void;
});

export const importCommand = Command.make("import", flags, (input) =>
	runImport(input).pipe(Effect.catch((error) => Effect.andThen(Console.error(errorMessage(error)), fail))),
).pipe(Command.withDescription("Convert an existing PBIP project to a pbirkit config"));
