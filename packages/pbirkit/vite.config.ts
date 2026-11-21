import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

import corePackageJson from "../core/package.json" with { type: "json" };

const toPosix = (file: string): string => file.replaceAll("\\", "/");

const core = toPosix(fileURLToPath(new URL("../core/", import.meta.url)));
const corePackage = toPosix(fileURLToPath(new URL("./src/core-package.ts", import.meta.url)));

const entriesOf = ([key, target]: readonly [string, string]): ReadonlyArray<readonly [string, string]> => {
	const name = key.slice(2);
	const file = target.slice(2);
	if (!file.includes("*")) return [[name, `${core}${file}`]];
	const [prefix = "", suffix = ""] = file.split("*");
	return globSync(`${prefix}**/*${suffix}`, { cwd: core, exclude: ["**/*.test.ts"] })
		.map((match) => toPosix(match))
		.map((match) => [name.replace("*", match.slice(prefix.length, -suffix.length)), `${core}${match}`]);
};

export default defineConfig({
	pack: {
		entry: {
			cli: "./src/main.ts",
			...Object.fromEntries(Object.entries(corePackageJson.exports).flatMap((entry) => entriesOf(entry))),
		},
		dts: false,
		fixedExtension: false,
		outputOptions: { chunkFileNames: "chunks/[name]-[hash].js" },
		deps: { alwaysBundle: [/^@pbirkit\//u] },
		copy: [
			{ from: "../core/src", to: "dist", rename: "core" },
			{ from: "../../docs", to: "." },
			{ from: "../../README.md", to: "." },
		],
		plugins: [
			{
				name: "core-package",
				load: (id: string) =>
					toPosix(id) === corePackage ? 'export const CORE_PACKAGE = "pbirkit";' : undefined,
			},
		],
	},
});
