import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { NodeServices } from "@effect/platform-node";
import { Effect, HashMap, Option } from "effect";
import { expect, it } from "vite-plus/test";

import { requireInside } from "./discard.ts";
import { Change } from "./merge.ts";
import { buildTree } from "./outputs.ts";
import { treeFile } from "./tree.ts";

it("writes text entries with Desktop line endings over the same file from a copied folder", async () => {
	const root = mkdtempSync(join(tmpdir(), "pbirkit-outputs-"));
	mkdirSync(join(root, "definition"));
	writeFileSync(join(root, "definition", "expressions.tmdl"), "expression Old = 1\n");
	writeFileSync(join(root, "definition", "model.tmdl"), "model Model\n");

	const tree = await Effect.runPromise(
		buildTree(
			[
				{ path: "M/definition", sourceFolder: pathToFileURL(join(root, "definition/")) },
				{ path: "M/definition/expressions.tmdl", text: 'expression BasePath = "C:\\\\data"\n' },
			],
			[],
		).pipe(Effect.provide(NodeServices.layer)),
	);
	const text = (path: string) =>
		Option.map(HashMap.get(tree, path.toLowerCase()), (file) => new TextDecoder().decode(file.bytes));

	expect(text("M/definition/expressions.tmdl")).toEqual(
		Option.some('expression BasePath = "C:\\\\data"\r\n'),
	);
	expect(text("M/definition/model.tmdl")).toEqual(Option.some("model Model\r\n"));
});

it("refuses a discard that would reach through a link outside the out folder", async () => {
	const root = mkdtempSync(join(tmpdir(), "pbirkit-discard-"));
	mkdirSync(join(root, "outside"));
	writeFileSync(join(root, "outside", "keep.txt"), "keep");
	mkdirSync(join(root, "dist"));
	symlinkSync(join(root, "outside"), join(root, "dist", "R.Report"), "dir");

	const file = treeFile("R.Report/keep.txt", new TextEncoder().encode("keep"));
	const outcome = await Effect.runPromise(
		requireInside(join(root, "dist"), "dist", [Change.Delete({ file })]).pipe(
			Effect.flip,
			Effect.provide(NodeServices.layer),
		),
	);

	expect(outcome._tag).toBe("DiscardError");
	expect(readFileSync(join(root, "outside", "keep.txt"), "utf8")).toBe("keep");
});
