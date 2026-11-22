import { HashMap } from "effect";

import type { Tree, TreeFile } from "./tree.ts";
import { fileKey, isOwned } from "./tree.ts";

export interface Loss {
	readonly path: string;
	readonly part: string;
}

const OBJECTS: ReadonlySet<string> = new Set([
	"calculationGroup",
	"calculationItem",
	"column",
	"cultureInfo",
	"dataSource",
	"expression",
	"hierarchy",
	"level",
	"measure",
	"partition",
	"perspective",
	"queryGroup",
	"ref",
	"relationship",
	"role",
	"table",
]);

const PROPERTIES: ReadonlySet<string> = new Set(["ordinal"]);

const LINE = /^(\t*)([A-Za-z]+)(?:(:).*|\s+(\S.*))?$/u;

const FENCE = "```";

const decoder = new TextDecoder("utf-8");

interface Frame {
	readonly depth: number;
	readonly part: string | undefined;
}

const NAME = /^(?:'(?:[^']|'')*'|[^'=])*/u;

const nameOf = (rest: string): string => (NAME.exec(rest)?.[0] ?? rest).trim();

const partOf = (match: RegExpExecArray | null): string | undefined => {
	const [, , word = "", colon, rest] = match ?? [];
	if (colon !== undefined) return PROPERTIES.has(word) ? word : undefined;
	if (!OBJECTS.has(word)) return undefined;
	return rest === undefined ? word : `${word} ${nameOf(rest)}`;
};

const depthOf = (line: string): number => /^\t*/u.exec(line)?.[0].length ?? 0;

const partsOf = (file: TreeFile): ReadonlySet<string> => {
	const stack: Array<Frame> = [];
	const parts = new Set<string>();
	let fenced = false;

	for (const line of decoder.decode(file.bytes).replace(/^﻿/u, "").split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (fenced) {
			fenced = trimmed !== FENCE;
			continue;
		}
		if (trimmed === "") continue;
		const depth = depthOf(line);
		while ((stack.at(-1)?.depth ?? -1) >= depth) stack.pop();
		const parent = stack.at(-1);
		const open = parent === undefined ? depth === 0 : parent.part !== undefined && depth === parent.depth + 1;
		const part = open ? partOf(LINE.exec(line)) : undefined;
		const path = part === undefined || parent === undefined ? part : `${parent.part ?? ""} > ${part}`;
		stack.push({ depth, part: path });
		if (path !== undefined) parts.add(path);
		fenced = trimmed.endsWith(FENCE);
	}

	return parts;
};

const isModelFile = (owned: ReadonlyArray<string>, file: TreeFile): boolean =>
	fileKey(file.path).endsWith(".tmdl") && !isOwned(owned, file.path);

const partFiles = (tree: Tree, owned: ReadonlyArray<string>): ReadonlyMap<string, string> => {
	const found = new Map<string, string>();

	for (const file of HashMap.values(tree)) {
		if (!isModelFile(owned, file)) continue;
		for (const part of partsOf(file)) if (!found.has(part)) found.set(part, file.path);
	}

	return found;
};

const ancestorsOf = (part: string): ReadonlyArray<string> => {
	const pieces = part.split(" > ");
	return pieces.slice(1).map((_, index) => pieces.slice(0, index + 1).join(" > "));
};

export const modelLosses = (next: Tree, result: Tree, owned: ReadonlyArray<string>): ReadonlyArray<Loss> => {
	const kept = partFiles(result, owned);
	const lost = [...partFiles(next, owned)]
		.filter(([part]) => !kept.has(part))
		.map(([part, path]) => ({ path, part }))
		.toSorted((first, second) => (first.part < second.part ? -1 : 1));
	const parts = new Set(lost.map(({ part }) => part));

	return lost.filter(({ part }) => !ancestorsOf(part).some((ancestor) => parts.has(ancestor)));
};
