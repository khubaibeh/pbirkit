import { Effect, Option } from "effect";

import { ReportSelector, selectedPaths } from "@pbirkit/core/tree";

import { fileKey } from "../build/tree.ts";
import type { Tree } from "../build/tree.ts";
import { indexTree } from "../pbip/tree.ts";
import { SelectorNotFoundError } from "./errors.ts";

export type Selectors = Readonly<Record<ReportSelector, ReadonlyArray<string>>>;

export const NO_SELECTORS: Selectors = { page: [], visual: [], bookmark: [], theme: [] };

export const selectedScope = Effect.fnUntraced(function* (
	name: string,
	report: string,
	trees: ReadonlyArray<Tree>,
	selectors: Selectors,
) {
	const pending = ReportSelector.literals.flatMap((kind) => selectors[kind].map((item) => ({ kind, item })));
	if (pending.length === 0) return Option.none<(path: string) => boolean>();

	const indexes = trees.map((tree) => indexTree(name, report, tree));
	const selected = new Set<string>();
	for (const { kind, item } of pending) {
		const matches = indexes.flatMap((index) => selectedPaths(index, kind, item));
		if (matches.length === 0) return yield* new SelectorNotFoundError({ kind, name: item });
		for (const path of matches) selected.add(fileKey(path));
	}

	return Option.some((path: string) => selected.has(fileKey(path)));
});
