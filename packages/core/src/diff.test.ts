import { describe, expect, it } from "vite-plus/test";

import type { FileTree } from "./diff.ts";
import { diffTrees } from "./diff.ts";

const encoder = new TextEncoder();
const tree = (files: Readonly<Record<string, string>>): FileTree =>
	new Map(Object.entries(files).map(([path, text]) => [path, encoder.encode(text)]));

const semantic = { mode: "semantic", maxPointers: 5 } as const;

describe("diffTrees", () => {
	it("ignores JSON key order, whitespace, line endings and equivalent numbers in semantic mode", () => {
		const expected = tree({ "Sales.pbip": '{\r\n  "a": 1,\r\n  "b": [2]\r\n}' });
		const actual = tree({ "Sales.pbip": '{"b":[2],"a":1.0}' });

		expect(diffTrees(expected, actual, semantic)).toEqual([]);
		expect(diffTrees(expected, actual, { ...semantic, mode: "bytes" })).toEqual([
			{ kind: "changed", path: "Sales.pbip", pointers: [], more: 0 },
		]);
	});

	it("compares other files by bytes and marks invalid JSON as changed", () => {
		expect(
			diffTrees(
				tree({ "a.txt": "{}", "b.json": "invalid" }),
				tree({ "a.txt": "{ }", "b.json": "invalid" }),
				semantic,
			),
		).toEqual([
			{ kind: "changed", path: "a.txt", pointers: [], more: 0 },
			{ kind: "changed", path: "b.json", pointers: [], more: 0 },
		]);
	});

	it("sorts missing and extra files by path", () => {
		expect(diffTrees(tree({ "z.json": "{}", "b.json": "{}" }), tree({ "a.json": "{}" }), semantic)).toEqual([
			{ kind: "extra", path: "a.json" },
			{ kind: "missing", path: "b.json" },
			{ kind: "missing", path: "z.json" },
		]);
	});

	it("escapes pointers, compares arrays in order, and counts paths beyond the cap", () => {
		const expected = tree({ "visual.json": '{"/~":[1,2],"z":1}' });
		const actual = tree({ "visual.json": '{"/~":[2,1,3]}' });
		const changed = diffTrees(expected, actual, { ...semantic, maxPointers: 3 });

		expect(changed).toEqual([
			{
				kind: "changed",
				path: "visual.json",
				pointers: [
					{ pointer: "/~1~0/0", expected: "1", actual: "2" },
					{ pointer: "/~1~0/1", expected: "2", actual: "1" },
					{ pointer: "/~1~0/2", expected: "(absent)", actual: "3" },
				],
				more: 1,
			},
		]);
	});

	it("truncates rendered values at 80 characters", () => {
		const expected = tree({ ".platform": JSON.stringify("x".repeat(100)) });
		const actual = tree({ ".platform": '"y"' });

		expect(diffTrees(expected, actual, semantic)).toEqual([
			{
				kind: "changed",
				path: ".platform",
				pointers: [{ pointer: "", expected: `"${"x".repeat(78)}…`, actual: '"y"' }],
				more: 0,
			},
		]);
	});
});
