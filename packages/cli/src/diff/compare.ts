import { Array as Arr, Effect, HashMap, Option, Path, Predicate } from "effect";

import { buildFiles, desktopOwnedPaths, modelFolderOf, reportFolder } from "@pbirkit/core/build";
import type { Config } from "@pbirkit/core/config";

import { buildTree } from "../build/outputs.ts";
import { fromCwd } from "../build/paths.ts";
import { isOwned, projectEntries, readTree, sameText } from "../build/tree.ts";
import type { Tree, TreeFile } from "../build/tree.ts";
import { TargetMissingError } from "./errors.ts";
import { selectedScope } from "./scope.ts";
import type { Selectors } from "./scope.ts";

export type CompareMode = "semantic" | "bytes";

interface PointerDifference {
	readonly pointer: string;
	readonly expected: string;
	readonly actual: string;
}

interface ChangedFile {
	readonly kind: "changed";
	readonly path: string;
	readonly pointers: ReadonlyArray<PointerDifference>;
	readonly more: number;
}

export type FileDifference =
	| { readonly kind: "missing"; readonly path: string }
	| { readonly kind: "extra"; readonly path: string }
	| ChangedFile;

type FileResult = FileDifference | { readonly kind: "endings"; readonly path: string };

export interface Comparison {
	readonly differences: ReadonlyArray<FileDifference>;
	readonly endings: ReadonlyArray<string>;
	readonly checked: number;
}

const MAX_POINTERS = 5;

const decoder = new TextDecoder("utf-8", { fatal: true });

const JSON_PATH = /\.(?:json|pbip|pbir|pbism|platform)$/iu;

export const parseJson = (bytes: Uint8Array): unknown => {
	try {
		const value: unknown = JSON.parse(decoder.decode(bytes));
		return value;
	} catch {
		return undefined;
	}
};

const renderValue = (value: unknown): string => {
	const text = JSON.stringify(value) ?? "(absent)";
	return text.length > 80 ? `${text.slice(0, 79)}…` : text;
};

const pointerSegment = (key: string): string => key.replaceAll("~", "~0").replaceAll("/", "~1");

export const jsonDifferences = (expected: unknown, actual: unknown): ReadonlyArray<PointerDifference> => {
	const found: Array<PointerDifference> = [];

	const visit = (left: unknown, right: unknown, pointer: string): void => {
		if (left === right) return;
		if (Arr.isArray(left) && Arr.isArray(right)) {
			for (let index = 0; index < Math.max(left.length, right.length); index++)
				visit(left[index], right[index], `${pointer}/${index}`);
			return;
		}
		if (Predicate.isReadonlyObject(left) && Predicate.isReadonlyObject(right)) {
			for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].toSorted())
				visit(
					Object.hasOwn(left, key) ? left[key] : undefined,
					Object.hasOwn(right, key) ? right[key] : undefined,
					`${pointer}/${pointerSegment(key)}`,
				);
			return;
		}
		found.push({ pointer, expected: renderValue(left), actual: renderValue(right) });
	};

	visit(expected, actual, "");
	return found;
};

const changedFile = (mode: CompareMode, left: TreeFile, right: TreeFile): FileResult | undefined => {
	if (left.hash === right.hash) return undefined;
	if (sameText(left, right)) return { kind: "endings", path: left.path };

	const changed = (pointers: ReadonlyArray<PointerDifference>): ChangedFile => ({
		kind: "changed",
		path: left.path,
		pointers: pointers.slice(0, MAX_POINTERS),
		more: Math.max(0, pointers.length - MAX_POINTERS),
	});
	if (mode === "bytes" || !JSON_PATH.test(left.path)) return changed([]);

	const expected = parseJson(left.bytes);
	const actual = parseJson(right.bytes);
	if (expected === undefined || actual === undefined) return changed([]);

	const pointers = jsonDifferences(expected, actual);
	return pointers.length === 0 ? undefined : changed(pointers);
};

const fileDifference = (
	mode: CompareMode,
	left: Option.Option<TreeFile>,
	right: Option.Option<TreeFile>,
): Option.Option<FileResult> =>
	Option.match(left, {
		onNone: () => Option.map(right, (file) => ({ kind: "extra" as const, path: file.path })),
		onSome: (expected) =>
			Option.match(right, {
				onNone: () => Option.some({ kind: "missing" as const, path: expected.path }),
				onSome: (actual) => Option.fromNullishOr(changedFile(mode, expected, actual)),
			}),
	});

export const compareTrees = (expected: Tree, actual: Tree, mode: CompareMode): Comparison => {
	const keys = [...new Set([...HashMap.keys(expected), ...HashMap.keys(actual)])].toSorted();

	const results = keys.flatMap((key) =>
		Option.toArray(fileDifference(mode, HashMap.get(expected, key), HashMap.get(actual, key))),
	);

	return {
		differences: results.filter((result): result is FileDifference => result.kind !== "endings"),
		endings: results.flatMap((result) => (result.kind === "endings" ? [result.path] : [])),
		checked: keys.length,
	};
};

const restrict = (tree: Tree, keep: (path: string) => boolean): Tree =>
	HashMap.filter(tree, (file) => keep(file.path));

export const compareProject = Effect.fnUntraced(function* (
	config: Config,
	target: string,
	mode: CompareMode,
	selectors: Selectors,
) {
	const path = yield* Path.Path;

	const report = reportFolder(config);
	const owned = projectEntries(`${config.name}.pbip`, report, Option.getOrUndefined(modelFolderOf(config)));
	const desktopOwned = desktopOwnedPaths(config);
	const included = (file: string) => isOwned(owned, file) && !isOwned(desktopOwned, file);

	const built = yield* buildTree(
		buildFiles(config).filter((file) => included("sourceFolder" in file ? `${file.path}/` : file.path)),
		[],
	);
	const project = yield* readTree(target, owned);
	if (Option.isNone(project)) return yield* new TargetMissingError({ folder: fromCwd(path, target) });

	const expected = restrict(built, included);
	const actual = restrict(project.value, included);
	const scope = yield* selectedScope(config.name, report, [expected, actual], selectors);

	return Option.match(scope, {
		onNone: () => compareTrees(expected, actual, mode),
		onSome: (selected) => compareTrees(restrict(expected, selected), restrict(actual, selected), mode),
	});
});
