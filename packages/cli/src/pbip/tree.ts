import { HashMap, Option } from "effect";

import { indexReport } from "@pbirkit/core/tree";
import type { ReportTree } from "@pbirkit/core/tree";

import { fileKey } from "../build/tree.ts";
import type { Tree } from "../build/tree.ts";

const decoder = new TextDecoder();

export const fileText = (tree: Tree, path: string): string | undefined =>
	Option.getOrUndefined(Option.map(HashMap.get(tree, fileKey(path)), (file) => decoder.decode(file.bytes)));

export const indexTree = (name: string, report: string, tree: Tree): ReportTree =>
	indexReport({
		name,
		report,
		paths: Array.from(HashMap.values(tree), (file) => file.path).toSorted(),
		text: (path) => fileText(tree, path),
	});

export const fileJson = (tree: Tree, path: string): unknown => {
	const text = fileText(tree, path);
	if (text === undefined) return undefined;
	try {
		const value: unknown = JSON.parse(text);
		return value;
	} catch {
		return undefined;
	}
};
