import { Effect, FileSystem, Option, Path } from "effect";

import { at } from "@pbirkit/core/expr";

import { onFileSystem } from "../build/errors.ts";
import { toPosix } from "../build/paths.ts";
import { projectEntries, readTree } from "../build/tree.ts";
import type { Tree } from "../build/tree.ts";
import { ProjectSourceError } from "./errors.ts";

export interface Project {
	readonly name: string;
	readonly filename: string;
	readonly root: string;
	readonly report: string;
	readonly model: string | undefined;
	readonly tree: Tree;
}

export const containedBy = (path: Path.Path, root: string, target: string): boolean => {
	const fromRoot = path.relative(root, target);
	return fromRoot !== ".." && !fromRoot.startsWith(`..${path.sep}`) && !path.isAbsolute(fromRoot);
};

const readJson = Effect.fnUntraced(function* (file: string) {
	const fs = yield* FileSystem.FileSystem;

	const text = yield* fs.readFileString(file).pipe(onFileSystem("read", file));
	return yield* Effect.try({
		try: (): unknown => JSON.parse(text),
		catch: () => new ProjectSourceError({ path: file, detail: "it is not valid JSON" }),
	});
});

const pbipFile = Effect.fnUntraced(function* (source: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const entry = yield* fs.stat(source).pipe(onFileSystem("inspect", source));
	if (entry.type === "File" && path.extname(source).toLowerCase() === ".pbip") return source;
	if (entry.type !== "Directory")
		return yield* new ProjectSourceError({
			path: source,
			detail: "expected a .pbip file or a folder holding one",
		});

	const names = (yield* fs.readDirectory(source).pipe(onFileSystem("list", source)))
		.filter((name) => path.extname(name).toLowerCase() === ".pbip")
		.toSorted();
	const [name] = names;
	if (name !== undefined && names.length === 1) return path.join(source, name);

	return yield* new ProjectSourceError({
		path: source,
		detail:
			names.length === 0
				? "expected a .pbip file or a folder holding one"
				: `it holds several .pbip files (${names.join(", ")}), so name the one to use`,
	});
});

const pathAt = (value: unknown, ...keys: ReadonlyArray<string>): string | undefined => {
	const found = keys.reduce<unknown>((item, key) => at(item, key), value);
	return typeof found === "string" ? found.replaceAll("\\", "/") : undefined;
};

const reportFolderOf = Effect.fnUntraced(function* (file: string, root: string) {
	const path = yield* Path.Path;

	const pbip = yield* readJson(file);
	const artifacts = at(pbip, "artifacts");
	const reportPath =
		Array.isArray(artifacts) && artifacts.length === 1 ? pathAt(artifacts[0], "report", "path") : undefined;
	const folder = reportPath === undefined ? root : path.resolve(root, reportPath);
	if (folder === root || !containedBy(path, root, folder))
		return yield* new ProjectSourceError({
			path: file,
			detail: "expected one report artifact inside the project",
		});

	return folder;
});

const modelFolderOf = Effect.fnUntraced(function* (root: string, report: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const modelPath = pathAt(
		yield* readJson(path.join(report, "definition.pbir")),
		"datasetReference",
		"byPath",
		"path",
	);
	if (modelPath === undefined) return Option.none<string>();

	const folder = path.resolve(report, modelPath);
	const separate =
		folder !== root &&
		containedBy(path, root, folder) &&
		!containedBy(path, report, folder) &&
		!containedBy(path, folder, report);
	const pbism = path.join(folder, "definition.pbism");
	return separate && (yield* fs.exists(pbism).pipe(onFileSystem("check", pbism)))
		? Option.some(folder)
		: Option.none();
});

export const findProject = Effect.fnUntraced(function* (source: string) {
	const path = yield* Path.Path;

	const file = yield* pbipFile(path.resolve(source));
	const root = path.dirname(file);
	const filename = path.basename(file);
	const reportFolder = yield* reportFolderOf(file, root);
	const relative = (folder: string) => toPosix(path, path.relative(root, folder));
	const report = relative(reportFolder);
	const model = Option.getOrUndefined(Option.map(yield* modelFolderOf(root, reportFolder), relative));
	const tree = yield* readTree(root, projectEntries(filename, report, model));
	if (Option.isNone(tree))
		return yield* new ProjectSourceError({ path: root, detail: "the folder does not exist" });

	const project: Project = {
		name: path.basename(file, path.extname(file)),
		filename,
		root,
		report,
		model,
		tree: tree.value,
	};
	return project;
});
