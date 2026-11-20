import { Array as Arr, Effect, FileSystem, HashMap, Option, Path, Predicate } from "effect";

import { onFileSystem } from "../build/errors.ts";
import { toPosix } from "../build/paths.ts";
import { projectEntries, readTree, treeFile } from "../build/tree.ts";
import type { TreeFile } from "../build/tree.ts";
import { ImportOutputError, ImportSourceError } from "./errors.ts";

export type JsonObject = Readonly<Record<string, unknown>>;
export type ArtifactFiles = ReadonlyMap<string, TreeFile>;

const decoder = new TextDecoder();

export const object = (value: unknown): JsonObject | undefined =>
	Predicate.isReadonlyObject(value) && !Arr.isArray(value) ? value : undefined;

export const strings = (value: unknown): ReadonlyArray<string> | undefined =>
	Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;

export const isName = (value: unknown): value is string =>
	typeof value === "string" &&
	value !== "" &&
	value !== "." &&
	value !== ".." &&
	!/[\\/:*?"<>|]/u.test(value);

export const jsonObject = (file: TreeFile | undefined): JsonObject | undefined => {
	if (file === undefined) return undefined;
	try {
		const value: unknown = JSON.parse(decoder.decode(file.bytes));
		return object(value);
	} catch {
		return undefined;
	}
};

export const requireObject = (file: TreeFile | undefined, path: string) =>
	Effect.fromNullishOr(jsonObject(file)).pipe(
		Effect.mapError(() => new ImportSourceError({ path, detail: "expected a JSON object" })),
	);

export const readFile = Effect.fnUntraced(function* (file: string, relative: string) {
	const fs = yield* FileSystem.FileSystem;

	return treeFile(relative, yield* fs.readFile(file).pipe(onFileSystem("read", file)));
});

export const readArtifact = Effect.fnUntraced(function* (root: string, relative: string) {
	const path = yield* Path.Path;
	const tree = yield* readTree(path.join(root, relative));

	if (Option.isNone(tree)) {
		return yield* new ImportSourceError({ path: path.join(root, relative), detail: "folder does not exist" });
	}

	const files = [...HashMap.values(tree.value)].toSorted((left, right) =>
		left.path.localeCompare(right.path),
	);
	return new Map(files.map((file) => [file.path, file]));
});

export const splitPlatform = Effect.fnUntraced(function* (files: ArtifactFiles, folder: string) {
	const file = `${folder}/.platform`;
	const { $schema, metadata, config } = yield* requireObject(files.get(".platform"), file);
	const contents = object(metadata);
	const settings = object(config);
	if (contents === undefined || settings === undefined) {
		return yield* new ImportSourceError({ path: file, detail: "expected .platform metadata and config" });
	}
	const { type: _type, displayName, ...rest } = contents;
	const { version, logicalId } = settings;

	return { displayName, logicalId, platform: { $schema, version, ...rest } };
});

const pbipFile = Effect.fnUntraced(function* (source: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const entry = yield* fs.stat(source).pipe(onFileSystem("inspect", source));

	if (entry.type === "File" && path.extname(source).toLowerCase() === ".pbip") return source;
	if (entry.type === "Directory") {
		const names = (yield* fs.readDirectory(source).pipe(onFileSystem("list", source)))
			.filter((name) => path.extname(name).toLowerCase() === ".pbip")
			.toSorted();
		const [name] = names;
		if (name !== undefined && names.length === 1) return path.join(source, name);
		if (names.length > 1) {
			return yield* new ImportSourceError({
				path: source,
				detail: `found several .pbip files (${names.join(", ")}). Specify the .pbip file to import`,
			});
		}
	}

	return yield* new ImportSourceError({
		path: source,
		detail: "expected a .pbip file or a folder containing one",
	});
});

const containedBy = (path: Path.Path, root: string, target: string) => {
	const fromRoot = path.relative(root, target);
	return fromRoot !== ".." && !fromRoot.startsWith(`..${path.sep}`) && !path.isAbsolute(fromRoot);
};

export const findProject = Effect.fnUntraced(function* (source: string) {
	const path = yield* Path.Path;
	const fs = yield* FileSystem.FileSystem;
	const file = yield* pbipFile(path.resolve(source));
	const root = path.dirname(file);
	const filename = path.basename(file);
	const name = path.basename(file, path.extname(file));
	const pbip = yield* requireObject(yield* readFile(file, filename), file);
	const { artifacts, ...pbipMetadata } = pbip;
	const entry = Array.isArray(artifacts) && artifacts.length === 1 ? object(artifacts[0]) : undefined;
	const reportPath = object(entry?.report)?.path;
	const reportRoot =
		typeof reportPath === "string" ? path.resolve(root, reportPath.replaceAll("\\", "/")) : root;

	if (reportRoot === root || !containedBy(path, root, reportRoot)) {
		return yield* new ImportSourceError({
			path: file,
			detail: "expected one report artifact inside the project",
		});
	}

	const pbirPath = path.join(reportRoot, "definition.pbir");
	const pbir = yield* requireObject(yield* readFile(pbirPath, "definition.pbir"), pbirPath);
	const reference = object(pbir.datasetReference);
	const modelPath = object(reference?.byPath)?.path;
	const modelRoot =
		typeof modelPath === "string" ? path.resolve(reportRoot, modelPath.replaceAll("\\", "/")) : root;
	const model =
		modelRoot !== root &&
		containedBy(path, root, modelRoot) &&
		!containedBy(path, reportRoot, modelRoot) &&
		!containedBy(path, modelRoot, reportRoot) &&
		(yield* fs.exists(path.join(modelRoot, "definition.pbism")).pipe(onFileSystem("check", modelRoot)))
			? toPosix(path, path.relative(root, modelRoot))
			: undefined;

	return {
		name,
		filename,
		root,
		report: toPosix(path, path.relative(root, reportRoot)),
		model,
		pbip: pbipMetadata,
		pbir,
		localReference: typeof modelPath === "string",
	};
});

export type Project = Effect.Success<ReturnType<typeof findProject>>;

export const checkOutput = Effect.fnUntraced(function* (out: string, project: Project, force: boolean) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const artifacts = [project.report, ...(project.model === undefined ? [] : [project.model])];
	if (artifacts.some((folder) => containedBy(path, path.join(project.root, folder), out))) {
		return yield* new ImportOutputError({ path: out, detail: "output must be outside the source artifacts" });
	}

	if (!(yield* fs.exists(out).pipe(onFileSystem("check", out)))) return yield* Effect.void;
	const entries = yield* fs.readDirectory(out).pipe(onFileSystem("list", out));
	if (entries.length > 0 && !force) {
		return yield* new ImportOutputError({
			path: out,
			detail: "folder is not empty. Use --force to overwrite imported files",
		});
	}

	return yield* Effect.void;
});

export const readProjectTree = Effect.fnUntraced(function* (project: Project) {
	const tree = yield* readTree(project.root, projectEntries(project.filename, project.report, project.model));
	return yield* Option.match(tree, {
		onNone: () => new ImportSourceError({ path: project.root, detail: "folder does not exist" }),
		onSome: Effect.succeed,
	});
});
