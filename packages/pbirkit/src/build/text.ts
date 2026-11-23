import { Option } from "effect";
import { parseTree, visit } from "jsonc-parser";
import type { Node } from "jsonc-parser";
import { diff3Merge } from "node-diff3";

import type { TreeFile } from "./tree.ts";
import { fileKey, treeFile } from "./tree.ts";

const JSON_FILES = [".json", ".pbir", ".pbism", ".pbip", ".platform"];

const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const encoder = new TextEncoder();

const asText = (file: TreeFile): Option.Option<string> =>
	file.bytes.includes(0) ? Option.none() : Option.liftThrowable(() => decoder.decode(file.bytes))();

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

const mergeLines = (original: string, desktop: string, src: string): Option.Option<string> =>
	Option.map(
		Option.filter(
			Option.liftThrowable(() => diff3Merge(desktop.split("\n"), original.split("\n"), src.split("\n")))(),
			(regions) => regions.every((region) => region.conflict === undefined),
		),
		(regions) => regions.flatMap((region) => region.ok ?? []).join("\n"),
	);

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

const numberKey = (raw: string): string => {
	const value = Number(raw);
	return Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))
		? String(value)
		: raw;
};

const canonicalOf = (node: Node, text: string): string => {
	const children = node.children ?? [];
	if (node.type === "object") {
		const entries = children.map((property) => {
			const [key, value] = property.children ?? [];
			return [JSON.stringify(key?.value), value === undefined ? "" : canonicalOf(value, text)] as const;
		});
		return `{${entries
			.toSorted(([first], [second]) => (first < second ? -1 : 1))
			.map(([key, value]) => `${key}:${value}`)
			.join(",")}}`;
	}
	if (node.type === "array") return `[${children.map((child) => canonicalOf(child, text)).join(",")}]`;
	if (node.type === "number") return numberKey(text.slice(node.offset, node.offset + node.length));
	return JSON.stringify(node.value) ?? "null";
};

const canonicalTree = (body: string): string | undefined => {
	if (!isStrictJson(body)) return undefined;
	const tree = parseTree(body, [], { disallowComments: true, allowTrailingComma: false });
	return tree === undefined ? undefined : canonicalOf(tree, body);
};

const canonicalJson = (file: TreeFile): Option.Option<string> =>
	Option.flatMap(
		Option.filter(asText(file), () => isJsonFile(file.path)),
		(text) =>
			Option.flatMap(
				Option.liftThrowable(() => canonicalTree(text.replace(/^\uFEFF/u, "")))(),
				Option.fromNullishOr,
			),
	);

export const sameJson = (left: TreeFile, right: TreeFile): boolean =>
	Option.exists(
		Option.all([canonicalJson(left), canonicalJson(right)]),
		([first, second]) => first === second,
	);
