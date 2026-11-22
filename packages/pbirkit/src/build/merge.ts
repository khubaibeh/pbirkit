import { Data, HashMap, Option } from "effect";

import type { Conflict, ConflictReason } from "./errors.ts";
import { mergeText } from "./text.ts";
import type { Tree, TreeFile } from "./tree.ts";
import { fileKey, isOwned, parentKeys, sameFile, treeOf } from "./tree.ts";

export type Prefer = "src" | "desktop";

type Outcome = Data.TaggedEnum<{
	Resolved: { readonly file: Option.Option<TreeFile>; readonly merged: boolean };
	Clash: { readonly reason: ConflictReason };
}>;

const Outcome = Data.taggedEnum<Outcome>();

export type Change = Data.TaggedEnum<{
	Write: { readonly file: TreeFile; readonly previous: Option.Option<TreeFile> };
	Delete: { readonly file: TreeFile };
}>;

export const Change = Data.taggedEnum<Change>();

export type PendingKind = "added" | "changed" | "deleted";

export interface Pending {
	readonly path: string;
	readonly kind: PendingKind;
}

export interface MergeInput {
	readonly snapshot: Option.Option<Tree>;
	readonly unfinished: ReadonlyArray<Tree>;
	readonly next: Tree;
	readonly project: Option.Option<Tree>;
	readonly prefer: Option.Option<Prefer>;
	readonly owned: ReadonlyArray<string>;
}

export interface MergeResult {
	readonly result: Tree;
	readonly conflicts: ReadonlyArray<Conflict>;
	readonly merged: ReadonlyArray<string>;
}

interface FileVersions {
	readonly key: string;
	readonly next: Option.Option<TreeFile>;
	readonly project: Option.Option<TreeFile>;
}

const clashReason = (
	base: Option.Option<TreeFile>,
	next: Option.Option<TreeFile>,
	project: Option.Option<TreeFile>,
): ConflictReason => {
	if (Option.isNone(project)) return "deleted-in-desktop";
	if (Option.isNone(next)) return "deleted-in-src";

	return Option.isNone(base) ? "added-in-both" : "both-changed";
};

const mergeFile = (
	snapshot: Option.Option<Tree>,
	unfinished: ReadonlyArray<Tree>,
	{ key, next, project }: FileVersions,
): Outcome => {
	if (sameFile(next, project)) return Outcome.Resolved({ file: next, merged: false });
	if (unfinished.some((tree) => sameFile(HashMap.get(tree, key), project))) {
		return Outcome.Resolved({ file: next, merged: false });
	}

	if (Option.isNone(snapshot)) {
		return Option.isNone(project)
			? Outcome.Resolved({ file: next, merged: false })
			: Outcome.Clash({ reason: "no-snapshot" });
	}

	const base = HashMap.get(snapshot.value, key);
	if (sameFile(base, project)) return Outcome.Resolved({ file: next, merged: false });
	if (sameFile(base, next)) return Outcome.Resolved({ file: project, merged: false });

	const merged = Option.flatMap(Option.all([base, project, next]), ([original, ours, theirs]) =>
		mergeText(original, ours, theirs),
	);

	return Option.isSome(merged)
		? Outcome.Resolved({ file: merged, merged: true })
		: Outcome.Clash({ reason: clashReason(base, next, project) });
};

const keysOf = (...trees: ReadonlyArray<Option.Option<Tree>>): ReadonlyArray<string> => [
	...new Set(
		trees.flatMap((tree) => Option.match(tree, { onNone: () => [], onSome: (t) => [...HashMap.keys(t)] })),
	),
];

const lookup = (tree: Option.Option<Tree>, key: string): Option.Option<TreeFile> =>
	Option.flatMap(tree, (files) => HashMap.get(files, key));

const displayPath = (key: string, ...files: ReadonlyArray<Option.Option<TreeFile>>): string =>
	files.flatMap((file) => Option.toArray(file)).at(0)?.path ?? key;

const folderClashes = (result: Tree): ReadonlyArray<Conflict> => {
	const keys = new Set(HashMap.keys(result));

	return [...HashMap.values(result)].flatMap((file) =>
		parentKeys(file.path).some((parent) => keys.has(parent))
			? [{ path: file.path, reason: "file-and-folder" }]
			: [],
	);
};

export const mergeTrees = ({
	snapshot,
	unfinished,
	next,
	project,
	prefer,
	owned,
}: MergeInput): MergeResult => {
	const result: Array<TreeFile> = [];
	const conflicts: Array<Conflict> = [];
	const merged: Array<string> = [];

	for (const key of keysOf(snapshot, Option.some(next), project)) {
		const versions = { key, next: HashMap.get(next, key), project: lookup(project, key) };
		const outcome = isOwned(owned, key)
			? Outcome.Resolved({ file: versions.project, merged: false })
			: Option.isNone(project)
				? Outcome.Resolved({ file: versions.next, merged: false })
				: mergeFile(snapshot, unfinished, versions);

		if (Outcome.$is("Resolved")(outcome)) {
			if (outcome.merged) merged.push(displayPath(key, outcome.file));
			result.push(...Option.toArray(outcome.file));
		} else if (Option.isSome(prefer)) {
			result.push(...Option.toArray(prefer.value === "src" ? versions.next : versions.project));
		} else {
			conflicts.push({ path: displayPath(key, versions.next, versions.project), reason: outcome.reason });
		}
	}

	const tree = treeOf(result);

	return { result: tree, conflicts: [...conflicts, ...folderClashes(tree)], merged };
};

export const changesBetween = (project: Option.Option<Tree>, result: Tree): ReadonlyArray<Change> => {
	const before = Option.getOrElse(project, () => HashMap.empty<string, TreeFile>());

	const deletes = [...HashMap.entries(before)].flatMap(([key, file]) =>
		Option.match(HashMap.get(result, key), {
			onNone: () => [Change.Delete({ file })],
			onSome: (after) => (after.path === file.path ? [] : [Change.Delete({ file })]),
		}),
	);

	const writes = [...HashMap.entries(result)].flatMap(([key, file]) => {
		const previous = Option.filter(HashMap.get(before, key), (old) => old.path === file.path);

		return sameFile(previous, Option.some(file)) ? [] : [Change.Write({ file, previous })];
	});

	return [...deletes, ...writes];
};

export const pendingPorts = (
	next: Tree,
	result: Tree,
	owned: ReadonlyArray<string>,
): ReadonlyArray<Pending> =>
	keysOf(Option.some(next), Option.some(result))
		.filter((key) => !isOwned(owned, key))
		.toSorted()
		.flatMap((key): ReadonlyArray<Pending> => {
			const built = HashMap.get(next, key);
			const kept = HashMap.get(result, key);

			if (sameFile(built, kept)) return [];
			if (Option.isNone(built)) {
				return Option.toArray(Option.map(kept, (file) => ({ path: file.path, kind: "added" })));
			}

			return [{ path: built.value.path, kind: Option.isNone(kept) ? "deleted" : "changed" }];
		});

export const changedUnder = (folder: string, before: Tree, after: Tree): boolean => {
	const prefix = `${fileKey(folder)}/`;

	return keysOf(Option.some(before), Option.some(after))
		.filter((key) => key.startsWith(prefix))
		.some((key) => !sameFile(HashMap.get(before, key), HashMap.get(after, key)));
};
