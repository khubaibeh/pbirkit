import { expect, it } from "vite-plus/test";

import corePackage from "../../core/package.json" with { type: "json" };
import pbirkitPackage from "../package.json" with { type: "json" };

const typesOf = (target: string): string => target.replace("./src/", "./dist/core/");

it("mirrors the core export map", () => {
	expect(pbirkitPackage.exports).toEqual({
		...Object.fromEntries(
			Object.entries(corePackage.exports).map(([key, target]) => [
				key,
				{ types: typesOf(target), default: `./dist/${key.slice(2)}.js` },
			]),
		),
		"./package.json": "./package.json",
	});
});

it("mirrors the core import map", () => {
	expect(pbirkitPackage.imports).toEqual(
		Object.fromEntries(Object.entries(corePackage.imports).map(([key, target]) => [key, typesOf(target)])),
	);
});
