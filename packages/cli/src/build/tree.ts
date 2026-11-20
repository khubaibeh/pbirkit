import { createHash, randomUUID } from "node:crypto";

import { Effect, FileSystem, HashMap, Option, Path } from "effect";

import { PathClashError, onFileSystem } from "./errors.ts";
import { MARKER, STAGING_FOLDER, toPosix } from "./paths.ts";

export interface TreeFile {
	readonly path: string;
	readonly bytes: Uint8Array;
	readonly hash: string;
}

export type Tree = HashMap.HashMap<string, TreeFile>;

const DESKTOP_ONLY = ["/.pbi/localsettings.json", "/.pbi/cache.abf"];

export const fileKey = (path: string): string => path.toLowerCase();

export const isOwned = (owned: ReadonlyArray<string>, path: string): boolean =>
	owned.some((entry) =>
		entry.endsWith("/") ? fileKey(path).startsWith(fileKey(entry)) : fileKey(path) === fileKey(entry),
	);

export const projectEntries = (pbip: string, report: string, model?: string): ReadonlyArray<string> => [
	pbip,
	`${report}/`,
	...(model === undefined ? [] : [`${model}/`]),
];

export const parentKeys = (path: string): ReadonlyArray<string> => {
	const parts = fileKey(path).split("/");

	return parts.slice(1).map((_, index) => parts.slice(0, index + 1).join("/"));
};

export const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const BOM = [0xef, 0xbb, 0xbf];

const LF = 10;

const CR = 13;

const textBody = (bytes: Uint8Array): Uint8Array => {
	const start = BOM.every((byte, index) => bytes[index] === byte) ? BOM.length : 0;
	return bytes.subarray(start).filter((byte, index, body) => byte !== CR || body[index + 1] !== LF);
};

export const sameText = (left: TreeFile, right: TreeFile): boolean =>
	!left.bytes.includes(0) &&
	!right.bytes.includes(0) &&
	hash(textBody(left.bytes)) === hash(textBody(right.bytes));

export const treeFile = (path: string, bytes: Uint8Array): TreeFile => ({ path, bytes, hash: hash(bytes) });

export const treeOf = (files: Iterable<TreeFile>): Tree =>
	HashMap.fromIterable([...files].map((file) => [fileKey(file.path), file] as const));

export const isTracked = (path: string): boolean => {
	const key = fileKey(path);

	return (
		key !== MARKER &&
		!key.startsWith(`${STAGING_FOLDER}/`) &&
		!DESKTOP_ONLY.some((suffix) => `/${key}`.endsWith(suffix))
	);
};

export const pathClashes = (files: ReadonlyArray<TreeFile>): ReadonlyArray<string> => {
	const seen = new Map<string, string>();

	return files.flatMap((file) =>
		Option.match(Option.fromNullishOr(seen.get(fileKey(file.path))), {
			onNone: () => {
				seen.set(fileKey(file.path), file.path);
				return [];
			},
			onSome: (first) => [`"${first}" and "${file.path}"`],
		}),
	);
};

export const sameFile = (left: Option.Option<TreeFile>, right: Option.Option<TreeFile>): boolean =>
	Option.match(left, {
		onNone: () => Option.isNone(right),
		onSome: (file) => Option.exists(right, (other) => other.hash === file.hash),
	});

const ownedEntries = Effect.fnUntraced(function* (folder: string, owned: ReadonlyArray<string>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const roots = new Set(owned.map((entry) => fileKey(entry.replace(/\/.*$/u, ""))));
	const tops = (yield* fs.readDirectory(folder).pipe(onFileSystem("list", folder))).filter((entry) =>
		roots.has(fileKey(entry)),
	);
	const nested = yield* Effect.forEach(
		tops,
		Effect.fnUntraced(function* (entry) {
			const target = path.join(folder, entry);
			if ((yield* fs.stat(target).pipe(onFileSystem("inspect", target))).type !== "Directory")
				return isOwned(owned, entry) ? [entry] : [];
			const files = yield* fs.readDirectory(target, { recursive: true }).pipe(onFileSystem("list", target));
			return isOwned(owned, `${entry}/`) ? files.map((file) => path.join(entry, file)) : [];
		}),
	);
	return nested.flat();
});

const readEntries = Effect.fnUntraced(function* (folder: string, owned: ReadonlyArray<string> | undefined) {
	const fs = yield* FileSystem.FileSystem;

	return owned === undefined
		? yield* fs.readDirectory(folder, { recursive: true }).pipe(onFileSystem("list", folder))
		: yield* ownedEntries(folder, owned);
});

export const readTree = Effect.fnUntraced(function* (folder: string, owned?: ReadonlyArray<string>) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	if (!(yield* fs.exists(folder).pipe(onFileSystem("check", folder)))) return Option.none<Tree>();

	const entries = yield* readEntries(folder, owned);
	const files: Array<TreeFile> = [];

	for (const entry of entries) {
		const relative = toPosix(path, entry);
		const target = path.join(folder, entry);

		if (!isTracked(relative)) continue;
		if ((yield* fs.stat(target).pipe(onFileSystem("inspect", target))).type !== "File") continue;

		files.push(treeFile(relative, yield* fs.readFile(target).pipe(onFileSystem("read", target))));
	}

	const clashes = pathClashes(files);
	if (clashes.length > 0) yield* new PathClashError({ folder, pairs: clashes });

	return Option.some(treeOf(files));
});

export const writeFileSafely = Effect.fnUntraced(function* (
	staging: string,
	target: string,
	bytes: Uint8Array,
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const temporary = path.join(staging, randomUUID());
	yield* fs.makeDirectory(staging, { recursive: true }).pipe(onFileSystem("create", staging));
	yield* fs.makeDirectory(path.dirname(target), { recursive: true }).pipe(onFileSystem("create", target));
	yield* fs.writeFile(temporary, bytes).pipe(onFileSystem("write", temporary));
	yield* fs.rename(temporary, target).pipe(onFileSystem("replace", target));
});

export const clearFolder = Effect.fnUntraced(function* (folder: string) {
	const fs = yield* FileSystem.FileSystem;

	yield* fs.remove(folder, { recursive: true, force: true }).pipe(onFileSystem("remove", folder));
});

export const writeTree = Effect.fnUntraced(function* (folder: string, tree: Tree) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	for (const file of HashMap.values(tree)) {
		const target = path.join(folder, file.path);
		yield* fs.makeDirectory(path.dirname(target), { recursive: true }).pipe(onFileSystem("create", target));
		yield* fs.writeFile(target, file.bytes).pipe(onFileSystem("write", target));
	}
});
