import { globSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

import corePackageJson from "../core/package.json" with { type: "json" };

const DOCS_URL = "https://github.com/khubaibeh/pbirkit/blob/main/";

const toPosix = (file: string): string => file.replaceAll("\\", "/");

const core = toPosix(fileURLToPath(new URL("../core/", import.meta.url)));
const corePackage = toPosix(fileURLToPath(new URL("./src/core-package.ts", import.meta.url)));
const coreExports: ReadonlyArray<readonly [string, string | null]> = Object.entries(corePackageJson.exports);

const patternOf = (key: string): RegExp =>
	new RegExp(`^${key.slice(2).replaceAll(".", "\\.").replace("*", ".+")}$`, "u");

const hidden = coreExports.flatMap(([key, target]) => (target === null ? [patternOf(key)] : []));

const entriesOf = ([key, target]: readonly [string, string]): ReadonlyArray<readonly [string, string]> => {
	const name = key.slice(2);
	const file = target.slice(2);
	if (!file.includes("*")) return [[name, `${core}${file}`]];
	const [prefix = "", suffix = ""] = file.split("*");
	return globSync(`${prefix}**/*${suffix}`, { cwd: core, exclude: ["**/*.test.ts"] })
		.map((match) => toPosix(match))
		.map(
			(match) => [name.replace("*", match.slice(prefix.length, -suffix.length)), `${core}${match}`] as const,
		)
		.filter(([entry]) => !hidden.some((pattern) => pattern.test(entry)));
};

export default defineConfig({
	pack: {
		entry: {
			cli: "./src/main.ts",
			...Object.fromEntries(
				coreExports.flatMap(([key, target]) => (target === null ? [] : entriesOf([key, target]))),
			),
		},
		dts: false,
		fixedExtension: false,
		outputOptions: { chunkFileNames: "chunks/[name]-[hash].js" },
		deps: { alwaysBundle: [/^@pbirkit\//u] },
		copy: [
			{ from: "../core/src", to: "dist", rename: "core" },
			{ from: "../../docs", to: "." },
		],
		hooks: {
			"build:done": () => {
				const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
				writeFileSync(
					new URL("README.md", import.meta.url),
					readme.replaceAll(/\]\((?!https?:|#)([^)]+)\)/gu, `](${DOCS_URL}$1)`),
				);
			},
		},
		plugins: [
			{
				name: "core-package",
				load: (id: string) =>
					toPosix(id) === corePackage ? 'export const CORE_PACKAGE = "pbirkit";' : undefined,
			},
		],
	},
});
