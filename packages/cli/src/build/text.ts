import { Option } from "effect";
import { visit } from "jsonc-parser";
import { diff3Merge } from "node-diff3";

import type { TreeFile } from "./tree.ts";
import { fileKey, treeFile } from "./tree.ts";

const JSON_FILES = [".json", ".pbir", ".pbism", ".pbip", ".platform"];

const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const encoder = new TextEncoder();

const asText = (file: TreeFile): Option.Option<string> => {
	if (file.bytes.includes(0)) return Option.none();

	try {
		return Option.some(decoder.decode(file.bytes));
	} catch {
		return Option.none();
	}
};

const isJsonFile = (path: string): boolean =>
	JSON_FILES.some((extension) => fileKey(path).endsWith(extension));

const isStrictJson = (text: string): boolean => {
	const keys: Array<Set<string>> = [];
	let valid = true;

	visit(
		text.replace(/^﻿/u, ""),
		{
			onObjectBegin: () => {
				keys.push(new Set());
			},
			onObjectEnd: () => {
				keys.pop();
			},
			onObjectProperty: (property) => {
				const current = keys.at(-1) ?? new Set<string>();
				if (current.has(property)) valid = false;
				current.add(property);
			},
			onError: () => {
				valid = false;
			},
		},
		{ disallowComments: true, allowTrailingComma: false },
	);

	return valid;
};

const mergeLines = (original: string, desktop: string, src: string): Option.Option<string> => {
	try {
		const regions = diff3Merge(desktop.split("\n"), original.split("\n"), src.split("\n"));
		if (regions.some((region) => region.conflict !== undefined)) return Option.none();

		return Option.some(regions.flatMap((region) => region.ok ?? []).join("\n"));
	} catch {
		return Option.none();
	}
};

export const mergeText = (base: TreeFile, desktop: TreeFile, src: TreeFile): Option.Option<TreeFile> =>
	Option.flatMap(Option.all([asText(base), asText(desktop), asText(src)]), ([original, ours, theirs]) =>
		Option.map(
			Option.filter(
				mergeLines(original, ours, theirs),
				(text) => !isJsonFile(src.path) || isStrictJson(text),
			),
			(text) => treeFile(src.path, encoder.encode(text)),
		),
	);
