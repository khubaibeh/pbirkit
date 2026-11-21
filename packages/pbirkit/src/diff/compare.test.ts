import { describe, expect, it } from "vite-plus/test";

import { treeFile, treeOf } from "../build/tree.ts";
import type { Tree } from "../build/tree.ts";
import { compareTrees } from "./compare.ts";

const encoder = new TextEncoder();

const tree = (files: Readonly<Record<string, string>>): Tree =>
	treeOf(Object.entries(files).map(([path, text]) => treeFile(path, encoder.encode(text))));

describe("compareTrees", () => {
	it("ignores JSON key order, whitespace, line endings and equivalent numbers in semantic mode", () => {
		const expected = tree({ "Sales.pbip": '{\r\n  "a": 1,\r\n  "b": [2]\r\n}' });
		const actual = tree({ "Sales.pbip": '{"b":[2],"a":1.0}' });

		expect(compareTrees(expected, actual, "semantic")).toEqual({ differences: [], endings: [], checked: 1 });
		expect(compareTrees(expected, actual, "bytes").differences).toEqual([
			{ kind: "changed", path: "Sales.pbip", pointers: [], more: 0 },
		]);
	});

	it("compares other files by bytes and marks invalid JSON as changed", () => {
		expect(
			compareTrees(
				tree({ "a.txt": "{}", "b.json": "invalid", "c.json": "same" }),
				tree({ "a.txt": "{ }", "b.json": "invalid ", "c.json": "same" }),
				"semantic",
			),
		).toEqual({
			differences: [
				{ kind: "changed", path: "a.txt", pointers: [], more: 0 },
				{ kind: "changed", path: "b.json", pointers: [], more: 0 },
			],
			endings: [],
			checked: 3,
		});
	});

	it("lists files that differ only in line endings or a BOM, and counts them as changed in bytes mode", () => {
		const expected = treeOf([
			treeFile("model.tmdl", encoder.encode("model Model\r\n\ttable A\r\n")),
			treeFile("page.json", encoder.encode('{\r\n  "a": 1\r\n}')),
			treeFile("other.txt", encoder.encode("a\r\nb")),
			treeFile("image.png", Uint8Array.from([0, 13, 10])),
		]);
		const actual = treeOf([
			treeFile("model.tmdl", encoder.encode("model Model\n\ttable A\n")),
			treeFile("page.json", encoder.encode('\uFEFF{\n  "a": 1\n}')),
			treeFile("other.txt", encoder.encode("a\nc")),
			treeFile("image.png", Uint8Array.from([0, 10])),
		]);

		expect(compareTrees(expected, actual, "text")).toEqual({
			differences: [
				{ kind: "changed", path: "image.png", pointers: [], more: 0 },
				{ kind: "changed", path: "other.txt", pointers: [], more: 0 },
			],
			endings: ["model.tmdl", "page.json"],
			checked: 4,
		});
		expect(compareTrees(expected, actual, "bytes")).toEqual({
			differences: [
				{ kind: "changed", path: "image.png", pointers: [], more: 0 },
				{ kind: "changed", path: "model.tmdl", pointers: [], more: 0 },
				{ kind: "changed", path: "other.txt", pointers: [], more: 0 },
				{ kind: "changed", path: "page.json", pointers: [], more: 0 },
			],
			endings: ["model.tmdl", "page.json"],
			checked: 4,
		});
	});

	it("matches paths without letter case and sorts missing and extra files", () => {
		expect(
			compareTrees(
				tree({ "z.json": "{}", "B.json": "{}", "Same.json": "{}" }),
				tree({ "a.json": "{}", "same.json": "{}" }),
				"semantic",
			).differences,
		).toEqual([
			{ kind: "extra", path: "a.json" },
			{ kind: "missing", path: "B.json" },
			{ kind: "missing", path: "z.json" },
		]);
	});
});
