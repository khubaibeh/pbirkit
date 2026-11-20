import { Effect, Iterable, Option } from "effect";
import { Array, String, Struct, decodeUnknownOption, fromJsonString, optionalKey } from "effect/Schema";

import type { FileTree } from "@pbirkit/core/diff";

import { SelectorKind, SelectorNotFoundError } from "./errors.ts";

type Selectors = Readonly<Record<SelectorKind, ReadonlyArray<string>>>;

const PackageItem = Struct({ name: String, path: String, type: String });
const ResourcePackage = Struct({ name: String, items: Array(PackageItem) });
const readReport = decodeUnknownOption(
	fromJsonString(Struct({ resourcePackages: optionalKey(Array(ResourcePackage)) })),
);
const decoder = new TextDecoder();

const themePaths = (expected: FileTree, actual: FileTree) => {
	const themes = new Map<string, Set<string>>();
	for (const [path, bytes] of Iterable.appendAll(expected, actual)) {
		const [report, definition, file, ...rest] = path.split("/");
		if (definition !== "definition" || file !== "report.json" || rest.length > 0) continue;

		const parsed = readReport(decoder.decode(bytes));
		if (Option.isNone(parsed)) continue;
		for (const pkg of parsed.value.resourcePackages ?? []) {
			for (const item of pkg.items) {
				if (item.type !== "BaseTheme" && item.type !== "CustomTheme") continue;
				const paths = themes.get(item.name) ?? new Set<string>();
				paths.add(`${report}/StaticResources/${pkg.name}/${item.path}`);
				themes.set(item.name, paths);
			}
		}
	}
	return themes;
};

const matchesPath = (kind: Exclude<SelectorKind, "theme">, name: string, path: string): boolean => {
	const [, definition, folder, page, visuals, visual, file] = path.split("/");
	if (definition !== "definition") return false;
	if (kind === "bookmark") {
		return folder === "bookmarks" && page === `${name}.bookmark.json` && visuals === undefined;
	}
	if (folder !== "pages") return false;
	if (kind === "page") return page === name && visuals !== undefined;
	return visuals === "visuals" && file !== undefined && (name === visual || name === `${page}/${visual}`);
};

export const scopeTrees = Effect.fnUntraced(function* (
	expected: FileTree,
	actual: FileTree,
	selectors: Selectors,
) {
	const pending = SelectorKind.literals.flatMap((kind) => selectors[kind].map((name) => ({ kind, name })));
	if (pending.length === 0) return { expected, actual };

	const paths = new Set([...expected.keys(), ...actual.keys()]);
	const themes = selectors.theme.length > 0 ? themePaths(expected, actual) : undefined;
	const selected = new Set<string>();
	for (const { kind, name } of pending) {
		const matches =
			kind === "theme"
				? [...(themes?.get(name) ?? [])].filter((path) => paths.has(path))
				: [...paths].filter((path) => matchesPath(kind, name, path));
		if (matches.length === 0) return yield* new SelectorNotFoundError({ kind, name });
		for (const path of matches) selected.add(path);
	}
	const pick = (tree: FileTree): FileTree => new Map([...tree].filter(([path]) => selected.has(path)));
	return { expected: pick(expected), actual: pick(actual) };
});
