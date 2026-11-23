import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { discardTrees, pendingPorts } from "./merge.ts";
import { modelLosses } from "./tmdl.ts";
import { treeFile, treeOf } from "./tree.ts";

const encoder = new TextEncoder();

const tree = (files: Readonly<Record<string, string>>) =>
	treeOf(Object.entries(files).map(([path, text]) => treeFile(path, encoder.encode(text))));

describe("pendingPorts", () => {
	it("tells reformatted files apart from changed ones", () => {
		const next = tree({
			"a.json": '{"a":1,"b":[1,2]}',
			"b.json": '{"a":1}',
			"c.tmdl": "table A\n",
			"d.json": '{"a":1}',
		});
		const result = tree({
			"a.json": '{\n\t"b": [1, 2],\n\t"a": 1\n}',
			"b.json": '{"a":2}',
			"c.tmdl": "table A\r\n",
			"d.json": '{"a":1,"a":1}',
		});

		expect(pendingPorts(next, result, [], [])).toEqual([
			{ path: "a.json", kind: "reformatted" },
			{ path: "b.json", kind: "changed" },
			{ path: "c.tmdl", kind: "reformatted" },
			{ path: "d.json", kind: "changed" },
		]);
	});

	it("keeps numbers that a double can't hold apart", () => {
		const next = tree({
			"a.json": '{"a":9007199254740992}',
			"b.json": '{"a":1e400}',
			"c.json": '{"a":1.50}',
		});
		const result = tree({
			"a.json": '{"a":9007199254740993}',
			"b.json": '{"a":null}',
			"c.json": '{"a":1.5}',
		});

		expect(pendingPorts(next, result, [], [])).toEqual([
			{ path: "a.json", kind: "changed" },
			{ path: "b.json", kind: "changed" },
			{ path: "c.json", kind: "reformatted" },
		]);
	});

	it("treats JSON too deep to parse as changed", () => {
		const deep = `${"[".repeat(10_000)}${"]".repeat(10_000)}`;

		expect(pendingPorts(tree({ "a.json": "[]" }), tree({ "a.json": deep }), [], [])).toEqual([
			{ path: "a.json", kind: "changed" },
		]);
	});

	it("leaves out files that src does not build outside the project", () => {
		const next = tree({ "R.Report/a.json": "1" });
		const result = tree({ "R.Report/a.json": "1", "R.Report/b.json": "1", "notes.txt": "x" });

		expect(pendingPorts(next, result, [], ["R.Report/"])).toEqual([
			{ path: "R.Report/b.json", kind: "added" },
		]);
	});
});

describe("modelLosses", () => {
	const model = [
		"table Calc",
		"\tcalculationGroup",
		"",
		"\t\tcalculationItem YTD = CALCULATE(SELECTEDMEASURE())",
		"\t\t\tordinal: 0",
		"",
		"\t\tcalculationItem 'Prior Year' =",
		"\t\t\tCALCULATE(SELECTEDMEASURE())",
		"\t\t\tordinal: 1",
		"",
		"\tpartition Calc = calculationGroup",
		"\t\tmode: import",
		"",
	].join("\n");

	it("names the parts that Desktop removed", () => {
		const next = tree({
			"Model/definition/tables/Calc.tmdl": model,
			"Model/definition/model.tmdl": "ref table Calc\nref table Sales\n",
		});
		const result = tree({
			"Model/definition/tables/Calc.tmdl": model
				.replace("\t\t\tordinal: 0\n", "")
				.replace("\t\t\tordinal: 1\n", "")
				.replace(/\tpartition[^]*$/u, ""),
			"Model/definition/model.tmdl": "ref table Calc\n",
		});

		expect(modelLosses(next, result, [])).toEqual([
			{ path: "Model/definition/model.tmdl", part: "ref table Sales" },
			{
				path: "Model/definition/tables/Calc.tmdl",
				part: "table Calc > calculationGroup > calculationItem 'Prior Year' > ordinal",
			},
			{
				path: "Model/definition/tables/Calc.tmdl",
				part: "table Calc > calculationGroup > calculationItem YTD > ordinal",
			},
			{ path: "Model/definition/tables/Calc.tmdl", part: "table Calc > partition Calc" },
		]);
	});

	it("reads quoted names, skips expression bodies and merges partial declarations", () => {
		const next = tree({
			"M/a.tmdl": [
				"ref table 'A=B'",
				"table Sales",
				"\tmeasure Total = ```",
				"\t\tcolumn Ghost",
				"\t\t```",
				"\tmeasure Other =",
				"\t\t\tcolumn Ghost2",
				"",
			].join("\n"),
			"M/b.tmdl": "table Sales\n\tcolumn Amount\n",
		});
		const result = tree({
			"M/a.tmdl": "ref table 'A=C'\ntable Sales\n\tmeasure Total = 1\n\tmeasure Other = 2\n\tcolumn Amount\n",
		});

		expect(modelLosses(next, result, [])).toEqual([{ path: "M/a.tmdl", part: "ref table 'A=B'" }]);
	});

	it("ignores parts that moved to another file and the children of a lost part", () => {
		const next = tree({
			"Model/definition/tables/Calc.tmdl": model,
			"Model/definition/tables/Sales.tmdl": "table Sales\n\tcolumn Amount\n",
		});
		const result = tree({ "Model/definition/tables/Calc2.tmdl": model });

		expect(modelLosses(next, result, [])).toEqual([
			{ path: "Model/definition/tables/Sales.tmdl", part: "table Sales" },
		]);
	});
});

describe("discardTrees", () => {
	it("restores src, keeps owned and outside files, and lists what Desktop changed", () => {
		const snapshot = tree({ "R.Report/a.json": "1", "R.Report/b.json": "1", "R.Report/c.json": "1" });
		const next = tree({ "R.Report/a.json": "2", "R.Report/b.json": "1", "R.Report/c.json": "1" });
		const project = tree({
			"R.Report/a.json": "1",
			"R.Report/b.json": "3",
			"R.Report/added.json": "1",
			"R.Report/owned.json": "1",
			".gitignore": "x",
		});

		const { result, conflicts, discarded } = discardTrees({
			snapshot: Option.some(snapshot),
			next,
			project: Option.some(project),
			owned: ["R.Report/owned.json"],
			scope: ["R.pbip", "R.Report/"],
		});

		expect(conflicts).toEqual([]);
		expect(discarded).toEqual(["R.Report/added.json", "R.Report/b.json", "R.Report/c.json"]);
		expect(
			Object.fromEntries([...result].map(([, file]) => [file.path, new TextDecoder().decode(file.bytes)])),
		).toEqual({
			".gitignore": "x",
			"R.Report/a.json": "2",
			"R.Report/b.json": "1",
			"R.Report/c.json": "1",
			"R.Report/owned.json": "1",
		});
	});
});
