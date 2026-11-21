import { Effect, FileSystem, Path } from "effect";

import { insideProject } from "@pbirkit/core/build";

import { onFileSystem } from "../build/errors.ts";
import { fileKey, treeOf, writeTree } from "../build/tree.ts";
import type { TreeFile } from "../build/tree.ts";
import { Layout } from "../layout.ts";
import { containedBy } from "../pbip/project.ts";
import type { Project } from "../pbip/project.ts";
import { ImportOutputError } from "./errors.ts";
import type { ImportFiles } from "./modules.ts";

const readManifest = Effect.fnUntraced(function* (out: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const file = path.join(out, Layout.manifest);
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
	const targets = [...files.files.map((file) => file.path), ...files.folders, Layout.manifest].map((file) =>
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
	if (entries.length === 0) return yield* Effect.void;
	if (!force)
		return yield* new ImportOutputError({
			path: out,
			detail: "the folder is not empty. Use --force to replace the files an earlier import wrote",
		});

	const owned = new Set((yield* readManifest(out)).map((file) => fileKey(file)));
	for (const file of files.files) {
		const target = path.join(out, file.path);
		if (owned.has(fileKey(file.path)) || !(yield* fs.exists(target).pipe(onFileSystem("check", target))))
			continue;

		return yield* new ImportOutputError({
			path: target,
			detail: "an earlier import did not write this file, so --force does not replace it",
		});
	}

	return yield* Effect.void;
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

	const manifest = path.join(out, Layout.manifest);
	const listed = files.files.map((file) => file.path).toSorted();
	yield* fs
		.writeFileString(manifest, `${JSON.stringify(listed, null, "\t")}\n`)
		.pipe(onFileSystem("write", manifest));
});
