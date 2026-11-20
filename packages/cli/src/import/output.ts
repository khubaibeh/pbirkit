import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Option, Path, Predicate } from "effect";

import { insideProject } from "@pbirkit/core/build";
import { at } from "@pbirkit/core/expr";

import { onFileSystem } from "../build/errors.ts";
import { toPosix } from "../build/paths.ts";
import { treeOf, writeTree } from "../build/tree.ts";
import type { TreeFile } from "../build/tree.ts";
import { containedBy } from "../pbip/project.ts";
import type { Project } from "../pbip/project.ts";
import { ImportOutputError } from "./errors.ts";
import type { ImportFiles, TypePaths } from "./modules.ts";

export const MANIFEST = ".pbirkit-import.json";

const readManifest = Effect.fnUntraced(function* (out: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const file = path.join(out, MANIFEST);
	if (!(yield* fs.exists(file).pipe(onFileSystem("check", file)))) return [];
	const text = yield* fs.readFileString(file).pipe(onFileSystem("read", file));
	const value: unknown = yield* Effect.try({
		try: (): unknown => JSON.parse(text),
		catch: () => new ImportOutputError({ path: file, detail: "the import manifest is not valid JSON" }),
	});
	const files = Array.isArray(value) ? value : [];
	return files.filter((entry): entry is string => typeof entry === "string" && insideProject(entry));
});

const removeFile = Effect.fnUntraced(function* (out: string, relative: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const target = path.join(out, relative);
	yield* fs.remove(target, { force: true }).pipe(onFileSystem("remove", target));
	for (
		let folder = path.dirname(target);
		folder !== out && containedBy(path, out, folder);
		folder = path.dirname(folder)
	) {
		const entries = yield* fs.readDirectory(folder).pipe(Effect.orElseSucceed(() => {}));
		if (entries === undefined || entries.length > 0) return;
		yield* fs.remove(folder, { recursive: true }).pipe(onFileSystem("remove", folder));
	}
});

export const checkOutput = Effect.fnUntraced(function* (
	out: string,
	project: Project,
	files: ImportFiles,
	force: boolean,
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const sources = [project.report, ...(project.model === undefined ? [] : [project.model])].map((folder) =>
		path.join(project.root, folder),
	);
	const pbip = path.join(project.root, project.filename);
	const targets = [...files.files.map((file) => file.path), ...files.folders, MANIFEST].map((file) =>
		path.join(out, file),
	);
	if (
		targets.some((target) => target === pbip || sources.some((source) => containedBy(path, source, target)))
	)
		return yield* new ImportOutputError({
			path: out,
			detail: "the import would write into the source project",
		});

	if (!(yield* fs.exists(out).pipe(onFileSystem("check", out)))) return yield* Effect.void;
	const entries = yield* fs.readDirectory(out).pipe(onFileSystem("list", out));
	if (entries.length > 0 && !force)
		return yield* new ImportOutputError({
			path: out,
			detail: "the folder is not empty. Use --force to replace the files an earlier import wrote",
		});
	return yield* Effect.void;
});

const exportsOf = (value: unknown): ReadonlyArray<readonly [string, string]> =>
	Predicate.isReadonlyObject(value)
		? Object.entries(value).flatMap(([key, target]) =>
				typeof target === "string" ? [[key, target] as const] : [],
			)
		: [];

export const coreTypePaths = Effect.fnUntraced(function* () {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const root = fileURLToPath(new URL("../", import.meta.resolve("@pbirkit/core/config")));
	const manifest = yield* fs.readFileString(path.join(root, "package.json")).pipe(Effect.option);
	const value = Option.getOrUndefined(
		Option.flatMap(manifest, (text) => Option.liftThrowable((): unknown => JSON.parse(text))()),
	);
	if (at(value, "name") !== "@pbirkit/core") return {};
	const paths: TypePaths = Object.fromEntries(
		exportsOf(at(value, "exports")).map(([key, target]) => [
			`@pbirkit/core${key.slice(1)}`,
			[toPosix(path, path.join(root, target))],
		]),
	);
	return paths;
});

export const writeImport = Effect.fnUntraced(function* (
	out: string,
	files: ImportFiles,
	support: ReadonlyArray<TreeFile>,
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	for (const file of yield* readManifest(out)) yield* removeFile(out, file);

	const missing: Array<(typeof files.files)[number]> = [];
	for (const file of support) {
		const target = path.join(out, file.path);
		if (!(yield* fs.exists(target).pipe(onFileSystem("check", target)))) missing.push(file);
	}
	yield* writeTree(out, treeOf([...files.files, ...missing]));
	for (const folder of files.folders) {
		const target = path.join(out, folder);
		yield* fs.makeDirectory(target, { recursive: true }).pipe(onFileSystem("create", target));
	}

	const manifest = path.join(out, MANIFEST);
	const listed = files.files.map((file) => file.path).toSorted();
	yield* fs
		.writeFileString(manifest, `${JSON.stringify(listed, null, "\t")}\n`)
		.pipe(onFileSystem("write", manifest));
});
