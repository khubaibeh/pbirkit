import { posix } from "node:path";

import { LOCAL_TSCONFIG } from "./build/core-types.ts";

const SOURCES = "src";
const PAGES = `${SOURCES}/pages`;
const BOOKMARKS = `${SOURCES}/bookmarks`;
const STATIC = "static";
const MODEL = "model";
const INDEX = "index.ts";
const VISUALS = "visuals";
const ALIAS = "#/";
const STATIC_ALIAS = "#static/";

export const Layout = {
	config: "pbirkit.config.ts",
	report: "IMPORT.md",
	agents: "AGENTS.md",
	manifest: ".pbirkit-import.json",
	packageJson: "package.json",
	tsconfig: "tsconfig.json",
	gitignore: ".gitignore",
	localTsconfig: LOCAL_TSCONFIG,
	localFolder: posix.dirname(LOCAL_TSCONFIG),
	sources: SOURCES,
	aliases: { [`${ALIAS}*`]: `./${SOURCES}/*`, [`${STATIC_ALIAS}*`]: `./${STATIC}/*` },
	alias: ALIAS,
	staticAlias: STATIC_ALIAS,
	staticFolder: STATIC,
	model: MODEL,
	ids: `${SOURCES}/ids.ts`,
	palette: `${SOURCES}/palette.ts`,
	resources: `${SOURCES}/resources.ts`,
	pages: `${PAGES}/${INDEX}`,
	bookmarks: `${BOOKMARKS}/${INDEX}`,
	indexName: posix.basename(INDEX, ".ts"),
	visualsFolder: VISUALS,
	groupDepth: 2,
	page: (page: string): string => `${PAGES}/${page}/${INDEX}`,
	visual: (page: string, parts: ReadonlyArray<string>): string =>
		`${PAGES}/${page}/${VISUALS}/${parts.join("/")}.ts`,
	bookmark: (bookmark: string): string => `${BOOKMARKS}/${bookmark}.ts`,
	theme: (theme: string): string => `${SOURCES}/themes/${theme}.ts`,
	staticFile: (path: string): string => `${STATIC}/${path}`,
	modelFile: (path: string): string => `${MODEL}/${path}`,
} as const;
