import { Data, Effect, FileSystem, HashMap, Option, Path } from "effect";

import type { Conflict, ConflictReason } from "./errors.ts";
import type { Output } from "./outputs.ts";
import { hash } from "./outputs.ts";
import { toPosix } from "./paths.ts";
import type { LastHashes } from "./state.ts";

export type FileAction = Data.TaggedEnum<{
	Write: { readonly path: string; readonly bytes: Uint8Array };
	Keep: { readonly path: string };
	Delete: { readonly path: string };
	Conflict: { readonly path: string; readonly reason: ConflictReason };
}>;

export const FileAction = Data.taggedEnum<FileAction>();

export interface Scope {
	readonly root: string;
	readonly isOwned: (file: string) => boolean;
}

export interface PlanInput {
	readonly out: string;
	readonly outputs: ReadonlyArray<Output>;
	readonly last: LastHashes;
	readonly scopes: ReadonlyArray<Scope>;
	readonly force: boolean;
}

export const classifyOutput = (
	output: Output,
	current: Option.Option<string>,
	last: Option.Option<string>,
	force: boolean,
): FileAction => {
	if (Option.isNone(current)) return FileAction.Write(output);
	if (current.value === output.hash) return FileAction.Keep(output);
	if (force || Option.contains(last, current.value)) return FileAction.Write(output);
	return FileAction.Conflict({ path: output.path, reason: Option.isSome(last) ? "changed" : "differs" });
};

export const classifyStale = (
	path: string,
	current: Option.Option<string>,
	last: Option.Option<string>,
	force: boolean,
): Option.Option<FileAction> =>
	Option.map(current, (now) =>
		force || Option.contains(last, now)
			? FileAction.Delete({ path })
			: FileAction.Conflict({ path, reason: Option.isSome(last) ? "changed" : "extra" }),
	);

const currentHash = Effect.fnUntraced(function* (out: string, relative: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const target = path.join(out, relative);
	if (!(yield* fs.exists(target))) return Option.none<string>();
	return Option.some(hash(yield* fs.readFile(target)));
});

const ownedFiles = Effect.fnUntraced(function* (out: string, { root, isOwned }: Scope) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const folder = path.join(out, root);
	if (!(yield* fs.exists(folder))) return [];
	const files: Array<string> = [];
	for (const entry of yield* fs.readDirectory(folder, { recursive: true })) {
		if (!isOwned(path.basename(entry))) continue;
		if ((yield* fs.stat(path.join(folder, entry))).type === "File")
			files.push(`${root}/${toPosix(path, entry)}`);
	}
	return files;
});

const staleCandidates = Effect.fnUntraced(function* ({ out, outputs, last, scopes }: PlanInput) {
	const built = new Set(outputs.map((output) => output.path));
	const owned = yield* Effect.forEach(scopes, (scope) => ownedFiles(out, scope));
	return [...new Set([...HashMap.keys(last), ...owned.flat()])].filter((relative) => !built.has(relative));
});

export const planBuild = Effect.fnUntraced(function* (input: PlanInput) {
	const { out, outputs, last, force } = input;
	const built = yield* Effect.forEach(outputs, (output) =>
		Effect.map(currentHash(out, output.path), (current) =>
			classifyOutput(output, current, HashMap.get(last, output.path), force),
		),
	);
	const stale = yield* Effect.forEach(yield* staleCandidates(input), (relative) =>
		Effect.map(currentHash(out, relative), (current) =>
			Option.toArray(classifyStale(relative, current, HashMap.get(last, relative), force)),
		),
	);
	return [...built, ...stale.flat()];
});

export const conflictsOf = (plan: ReadonlyArray<FileAction>): ReadonlyArray<Conflict> =>
	plan.filter(FileAction.$is("Conflict")).map(({ path, reason }) => ({ path, reason }));

export const countOf = (plan: ReadonlyArray<FileAction>, tag: FileAction["_tag"]): number =>
	plan.filter((action) => action._tag === tag).length;
