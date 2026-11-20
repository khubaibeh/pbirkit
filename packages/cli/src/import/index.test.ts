import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { NodeServices } from "@effect/platform-node";
import { Effect, Predicate } from "effect";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vite-plus/test";

import { toJson } from "@pbirkit/core/build";

import { findProject } from "../pbip/project.ts";
import { indexTree } from "../pbip/tree.ts";
import { MAX_ROUNDS, settleConfig } from "./draft.ts";

vi.setConfig({ testTimeout: 30_000 });

const main = fileURLToPath(new URL("../main.ts", import.meta.url));
const core = fileURLToPath(new URL("../../../core", import.meta.url));
const tsgo = fileURLToPath(new URL("../../../../node_modules/.bin/tsgo", import.meta.url));

const sourceConfig = `import { defineConfig } from "@pbirkit/core/config";
import { SchemaUrl } from "@pbirkit/core/schema-url";

const platform = { $schema: SchemaUrl.platform["2.1.0"], version: "2.0" } as const;
const visual = (name: string, x: number, visualType = "textbox") => ({
	$schema: SchemaUrl.visual["2.13.0"],
	name,
	position: { x, y: 0, width: 100, height: 100 },
	visual: { visualType },
} as const);
const page = (name: string, visuals: ReadonlyArray<ReturnType<typeof visual>>) => ({
	$schema: SchemaUrl.page["2.1.0"],
	name,
	displayName: name,
	displayOption: "FitToPage",
	visuals,
} as const);
const bookmark = (name: string, activeSection: string) => ({
	$schema: SchemaUrl.bookmark["2.1.0"],
	name,
	displayName: name,
	explorationState: { version: "1.0", activeSection, sections: {} },
} as const);
const reportVersionAtImport = { visual: "2.13.0", page: "2.1.0", report: "3.3.0" };

export default defineConfig({
	name: "Example",
	pbip: { version: "1.0" },
	report: {
		logicalId: "b045d170-d2e9-4ade-bbfd-ca34ce61654e",
		platform,
		pbir: { $schema: SchemaUrl.pbir["2.0.0"], version: "4.0" },
		definition: {
			$schema: SchemaUrl.report["3.3.0"],
			themeCollection: {
				baseTheme: { name: "Base", type: "SharedResources", reportVersionAtImport },
				customTheme: { name: "Brand.json", type: "RegisteredResources", reportVersionAtImport },
			},
			publicCustomVisuals: ["PublicVisual"],
		},
		version: { $schema: SchemaUrl.version["1.0.0"], version: "2.0.0" },
		pagesMetadata: { $schema: SchemaUrl.pages["1.0.0"], activePageName: "second" },
		pages: [page("second", [visual("1-card", 100, "FileVisual"), visual("1_card", 200, "PublicVisual")]), page("first", [visual("notes", 0)])],
		bookmarks: {
			$schema: SchemaUrl.bookmarksMetadata["1.0.0"],
			items: [{ name: "views", displayName: "Views", children: [bookmark("overview", "second"), bookmark("detail", "first")] }],
		},
		resources: [
			{ kind: "customVisual", guid: "FileVisual", source: "file" },
			{ kind: "baseTheme", name: "Base", theme: { name: "Base" } },
			{ kind: "customTheme", name: "Brand.json", theme: { name: "Brand", dataColors: ["#001122"] } },
			{ kind: "image", name: "logo.png", file: new URL("./logo.png", import.meta.url) },
		],
		files: {
			"extra.txt": new URL("./extra.txt", import.meta.url),
			"CustomVisuals/FileVisual/extra.txt": new URL("./extra.txt", import.meta.url),
		},
	},
	model: {
		name: "Example model",
		path: "Example.SemanticModel",
		logicalId: "222f856b-522b-4908-abde-0cdf39bfbccb",
		platform,
		pbism: { version: "4.0" },
		definition: new URL("./model/", import.meta.url),
	},
});
`;

const run = (cwd: string, command: ReadonlyArray<string>) =>
	spawnSync(process.execPath, [main, ...command], { cwd, encoding: "utf8" });

const fixture = mkdtempSync(join(tmpdir(), "pbirkit-import-fixture-"));
let root: string;
let project: string;
let out: string;
let config: string;

beforeAll(() => {
	mkdirSync(join(fixture, "node_modules", "@pbirkit"), { recursive: true });
	symlinkSync(core, join(fixture, "node_modules", "@pbirkit", "core"), "junction");
	mkdirSync(join(fixture, "model"));
	writeFileSync(join(fixture, "model", "model.tmdl"), "model Model\n");
	writeFileSync(join(fixture, "model", "obsolete.tmdl"), "");
	writeFileSync(
		join(fixture, "logo.png"),
		Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axGjS0AAAAASUVORK5CYII=",
			"base64",
		),
	);
	writeFileSync(join(fixture, "extra.txt"), "Unmapped\n");
	writeFileSync(join(fixture, "pbirkit.config.ts"), sourceConfig);
	expect(spawnSync("git", ["init", "-q", fixture]).status).toBe(0);
	const build = run(fixture, ["build"]);
	expect(build.status, build.stderr).toBe(0);
});

afterAll(() => {
	rmSync(fixture, { recursive: true, force: true });
});

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "pbirkit-import-"));
	project = join(root, "project");
	out = join(root, "out");
	config = join(out, "pbirkit.config.ts");
	cpSync(join(fixture, "dist"), project, { recursive: true });
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

const definition = (...path: ReadonlyArray<string>) => join(project, "Example.Report", "definition", ...path);
const visual = (...path: ReadonlyArray<string>) => definition("pages", "first", "visuals", ...path);
const edit = (file: string, update: (contents: string) => string) => {
	writeFileSync(file, update(readFileSync(file, "utf8")));
};

const importProject = (...flags: ReadonlyArray<string>) => {
	const result = run(root, ["import", project, "-o", out, ...flags]);
	expect(result.status, result.stderr + result.stdout).toBe(0);
	expect(result.stderr).toBe("");
	expect(result.stdout).toMatch(/import: verified \d+ files/u);
	return result.stdout;
};

const tree = (...flags: ReadonlyArray<string>) => {
	const result = run(root, ["tree", ...flags]);
	expect(result.status, result.stderr).toBe(0);
	return result.stdout;
};

it("imports split modules, model assets and unmapped files without local dependencies", () => {
	mkdirSync(join(project, "Export"));
	writeFileSync(join(project, "Export", "unrelated.csv"), "unrelated\n");
	const stdout = importProject();
	expect(stdout).toContain("import: verified 23 files");
	expect(stdout).toContain("extra.txt: Copied 1 unmapped file");
	const contents = readFileSync(config, "utf8");
	expect(contents).toContain("pages: [\n\t\t\t_second,\n\t\t\t_first,");
	expect(contents).toContain("children: [\n\t\t\t\t\t\t_overview,\n\t\t\t\t\t\t_detail,");
	expect(contents).toContain('kind: "customVisual"');
	expect(contents).toContain('declare module "@pbirkit/core/register"');
	expect(contents).toContain('readonly "import:Example": {');
	expect(contents).toContain('readonly visuals: readonly [{ readonly guid: "FileVisual" }];');
	expect(contents).toContain('readonly builtinVisuals: readonly ["PublicVisual"];');
	expect(contents).toContain(
		'new URL("./assets/report/StaticResources/RegisteredResources/logo.png", import.meta.url)',
	);
	const page = readFileSync(join(out, "pages", "second", "page.ts"), "utf8");
	expect(page).toContain('from "./visuals/1-card.ts"');
	expect(page).toContain('from "./visuals/1_card.ts"');
	expect(page).toContain("import _1_card_2 from");
	expect(readFileSync(join(out, "assets", "model", "definition", "model.tmdl"), "utf8")).toBe(
		"model Model\r\n",
	);
	expect(
		readFileSync(join(out, "assets", "report", "CustomVisuals", "FileVisual", "extra.txt"), "utf8"),
	).toBe("Unmapped\n");
	expect(JSON.parse(readFileSync(join(out, "package.json"), "utf8"))).toEqual({ type: "module" });
	const settings = readFileSync(join(out, "tsconfig.json"), "utf8");
	expect(settings).toContain('"extends": "./.pbirkit/tsconfig.json"');
	expect(settings).not.toContain(core);
	expect(readFileSync(join(out, ".gitignore"), "utf8")).toBe(".pbirkit/\n");
	expect(readFileSync(join(out, ".pbirkit", "tsconfig.json"), "utf8")).toContain(
		`"@pbirkit/core/config": [\n\t\t\t\t"${join(core, "src", "config.ts")}"`,
	);
	expect(existsSync(join(out, "node_modules"))).toBe(false);
	writeFileSync(
		join(out, "other.ts"),
		[
			'import type { VisualType } from "@pbirkit/core/visual-type";',
			"",
			'declare module "@pbirkit/core/register" {',
			"\tinterface Register {",
			'\t\treadonly "import:Other": { readonly builtinVisuals: readonly ["OtherVisual"] };',
			'\t\treadonly "import:Broken": unknown;',
			"\t\treadonly loose: any;",
			'\t\treadonly other: { readonly builtinVisuals: readonly ["Wide"] };',
			"\t}",
			"}",
			"",
			'export const visualTypes: ReadonlyArray<VisualType> = ["OtherVisual", "PublicVisual", "FileVisual"];',
			'export const narrow: "Wide" extends VisualType ? false : string extends VisualType ? false : true = true;',
			"",
		].join("\n"),
	);
	edit(join(out, "tsconfig.json"), (value) =>
		value.replace('"pbirkit.config.ts"', '"pbirkit.config.ts", "other.ts"'),
	);
	const typecheck = () => spawnSync(tsgo, ["-p", out], { encoding: "utf8" });
	expect(typecheck().status, typecheck().stdout).toBe(0);
	rmSync(join(out, ".pbirkit"), { recursive: true });
	expect(typecheck().status).not.toBe(0);
	tree("-c", config);
	expect(typecheck().status, typecheck().stdout).toBe(0);
	writeFileSync(
		join(out, ".pbirkit", "tsconfig.json"),
		'{"compilerOptions":{"paths":{"@pbirkit/core/*":["/missing/*"]}}}',
	);
	tree("-c", config);
	expect(typecheck().status, typecheck().stdout).toBe(0);
	const diff = run(root, ["diff", "-c", config, "--target", project]);
	expect(diff.status, diff.stderr).toBe(0);
	expect(diff.stdout).toContain("No differences in 23 files.");
});

it("follows a renamed PBIP file's report artifact and preserves the report display name", () => {
	renameSync(join(project, "Example.pbip"), join(project, "Renamed.pbip"));
	importProject();
	const contents = readFileSync(config, "utf8");
	expect(contents).toContain('name: "Renamed"');
	expect(contents).toContain('path: "Example.Report"');
	expect(contents).toContain('displayName: "Example"');
	expect(tree("--pbip", project)).toBe(tree("-c", config));
});

it("indexes a renamed visual folder under the visual's JSON name and keeps its path", () => {
	renameSync(visual("notes"), visual("other"));
	expect(importProject()).toContain("Visual first/notes: Visual or page folder differs from its name");
	const fromProject = tree("--pbip", project);
	expect(fromProject).toContain("visual (textbox, notes, -) [raw]");
	expect(fromProject).toBe(tree("-c", config));
	expect(
		existsSync(
			join(out, "assets", "report", "definition", "pages", "first", "visuals", "other", "visual.json"),
		),
	).toBe(true);
});

it("keeps pages.json and bookmarks.json typed around a raw page and a raw bookmark", () => {
	edit(definition("pages", "first", "page.json"), (value) =>
		value.replace('"name"', '"futureProperty": true, "name"'),
	);
	edit(definition("bookmarks", "overview.bookmark.json"), (value) =>
		value.replace('"name"', '"futureProperty": true, "name"'),
	);
	const stdout = importProject();
	expect(stdout).toContain("Page first: Unsupported page schema or properties");
	expect(stdout).toContain("Bookmark overview: Unsupported bookmark schema or properties");
	expect(stdout).not.toContain("metadata");
	const contents = readFileSync(config, "utf8");
	expect(contents).toContain("pagesMetadata: {");
	expect(contents).toContain('name: "overview",\n\t\t\t\t\t\t\tfile: new URL(');
	const page = readFileSync(join(out, "pages", "first", "page.ts"), "utf8");
	expect(page).toContain(
		'file: new URL("../../assets/report/definition/pages/first/page.json", import.meta.url)',
	);
	expect(page).toContain('import _notes from "./visuals/notes.ts";');
	expect(existsSync(join(out, "bookmarks", "detail.ts"))).toBe(true);
	expect(tree("--pbip", project)).toBe(tree("-c", config));
});

it("builds the visuals listed in a raw page module", () => {
	edit(definition("pages", "first", "page.json"), (value) =>
		value.replace('"name"', '"futureProperty": true, "name"'),
	);
	importProject();
	edit(join(out, "pages", "first", "page.ts"), (value) => value.replace("\t\t_notes,\n", ""));
	const diff = run(root, ["diff", "-c", config, "--target", project]);
	expect(diff.status, diff.stderr).toBe(1);
	expect(diff.stdout).toContain("extra    Example.Report/definition/pages/first/visuals/notes/visual.json");
});

it("types a Desktop custom theme registered as Image and escapes generated module paths", () => {
	const brand = "Brand#100%.json";
	edit(definition("report.json"), (value) =>
		value.replaceAll("Brand.json", brand).replace('"type": "CustomTheme"', '"type": "Image"'),
	);
	const registered = join(project, "Example.Report", "StaticResources", "RegisteredResources");
	renameSync(join(registered, "Brand.json"), join(registered, brand));
	importProject();
	const contents = readFileSync(config, "utf8");
	expect(contents).toContain('kind: "customTheme"');
	expect(contents).toContain('itemType: "Image"');
	expect(contents).toContain('from "./themes/Brand~23100~25.ts"');
	expect(contents).not.toContain("resourcePackages:");
});

it("uses --force to replace only the files an earlier import wrote", () => {
	importProject();
	writeFileSync(join(out, "pages", "custom.ts"), "");
	writeFileSync(join(out, "notes.md"), "");
	const settings = '{"compilerOptions":{"strict":true}}';
	writeFileSync(join(out, "tsconfig.json"), settings);
	rmSync(join(project, "Example.SemanticModel", "definition", "obsolete.tmdl"));
	importProject("--force");
	expect(existsSync(join(out, "pages", "custom.ts"))).toBe(true);
	expect(existsSync(join(out, "notes.md"))).toBe(true);
	expect(existsSync(join(out, "assets", "model", "definition", "obsolete.tmdl"))).toBe(false);
	expect(existsSync(join(out, "pages", "second", "visuals", "1-card.ts"))).toBe(true);
	expect(readFileSync(join(out, "tsconfig.json"), "utf8")).toBe(settings);
});

it("rejects ambiguous input and protects a non-empty output without --force", () => {
	const protectedOut = run(root, ["import", project, "-o", project]);
	expect(protectedOut.status).toBe(2);
	expect(protectedOut.stderr).toContain("the folder is not empty");
	const intoSource = run(root, ["import", project, "-o", join(project, "Example.Report")]);
	expect(intoSource.status).toBe(2);
	expect(intoSource.stderr).toContain("the import would write into the source project");
	copyFileSync(join(project, "Example.pbip"), join(project, "Other.pbip"));
	const ambiguous = run(project, ["import"]);
	expect(ambiguous.status).toBe(2);
	expect(ambiguous.stderr).toContain("name the one to use");
	const ambiguousTree = run(project, ["tree", "--pbip", "."]);
	expect(ambiguousTree.status).toBe(2);
	expect(ambiguousTree.stderr).toBe(ambiguous.stderr.replace("[ERROR] import:", "[ERROR] tree:"));
});

it.each(["./../Example.SemanticModel", "..\\\\Example.SemanticModel"])(
	"keeps definition.pbir raw when it points at the model as %s",
	(reference) => {
		edit(join(project, "Example.Report", "definition.pbir"), (value) =>
			value.replace('"../Example.SemanticModel"', `"${reference}"`),
		);
		const stdout = importProject();
		expect(stdout).toContain("Report pbir: The rebuilt JSON differs from the source file");
		expect(readFileSync(config, "utf8")).toContain('path: "Example.SemanticModel"');
	},
);

const DESKTOP_JSON = /\.(?:json|pbip|pbir|pbism|platform|tmdl)$/u;

const textFiles = (folder: string): ReadonlyArray<string> =>
	readdirSync(folder, { recursive: true, encoding: "utf8" })
		.filter((entry) => DESKTOP_JSON.test(entry))
		.map((entry) => join(folder, entry));

const modules = (folder: string): Readonly<Record<string, string>> =>
	Object.fromEntries(
		readdirSync(folder, { recursive: true, encoding: "utf8" })
			.filter((entry) => entry.endsWith(".ts"))
			.toSorted()
			.map((entry) => [entry, readFileSync(join(folder, entry), "utf8")]),
	);

it("types an LF checkout with BOMs as fully as the CRLF original", () => {
	const crlf = importProject();
	const original = modules(out);
	rmSync(out, { recursive: true });
	for (const file of textFiles(project)) edit(file, (value) => value.replaceAll("\r\n", "\n"));
	for (const file of [
		definition("pages", "first", "page.json"),
		definition("bookmarks", "overview.bookmark.json"),
	])
		edit(file, (value) => `\uFEFF${value}`);
	const stdout = importProject();
	expect(stdout.split("\n").filter((line) => line.startsWith("  "))).toEqual(
		crlf.split("\n").filter((line) => line.startsWith("  ")),
	);
	expect(stdout).toMatch(
		/^\d+ files differ only in line endings or a BOM\. Build writes generated JSON with CRLF and no BOM, and converts copied \.json and \.tmdl files to CRLF\.$/mu,
	);
	expect(modules(out)).toEqual(original);
	expect(tree("--pbip", project)).toBe(tree("-c", config));
	const semantic = run(root, ["diff", "-c", config, "--target", project]);
	expect(semantic.status, semantic.stderr).toBe(0);
	expect(semantic.stdout).toMatch(/^No differences in \d+ files\.\n\d+ files differ only in line endings/u);
	const bytes = run(root, ["diff", "--bytes", "-c", config, "--target", project]);
	expect(bytes.status, bytes.stderr).toBe(1);
	expect(bytes.stdout).toContain("changed  Example.Report/definition/pages/first/page.json");
	expect(bytes.stdout).toMatch(/^0 missing, 0 extra, (\d+) changed\n\1 files differ only in line endings/mu);
});

const settle = (folder: string, rounds: number) =>
	Effect.runPromise(
		findProject(folder).pipe(
			Effect.map((found) => settleConfig(found, indexTree(found.name, found.report, found.tree), rounds)),
			Effect.provide(NodeServices.layer),
		),
	);

const resourcePackagesFirst = (value: string): string => {
	const parsed: unknown = JSON.parse(value);
	const entries = Predicate.isReadonlyObject(parsed) ? Object.entries(parsed) : [];
	return toJson(
		Object.fromEntries([
			...entries.filter(([key]) => key === "resourcePackages"),
			...entries.filter(([key]) => key !== "resourcePackages"),
		]),
	);
};

it("settles a drifted report.json over several rounds and stops at the round limit", async () => {
	edit(definition("report.json"), resourcePackagesFirst);
	const settled = await settle(project, MAX_ROUNDS);
	expect(settled.fallbacks.map(({ label }) => label)).not.toContain("Report definition");
	expect(Object.keys(settled.config.report.definition)[0]).toBe("resourcePackages");
	const limited = await settle(project, 1);
	expect(limited.config.report.definition).not.toHaveProperty("resourcePackages");
	const stdout = importProject();
	expect(stdout).not.toContain("Report definition");
});

const addGroup = () => {
	mkdirSync(visual("box"));
	writeFileSync(
		visual("box", "visual.json"),
		toJson({
			$schema:
				"https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.13.0/schema.json",
			name: "box",
			position: { x: 0, y: 0, width: 100, height: 100 },
			visualGroup: { displayName: "Box", groupMode: "ScaleMode" },
		}),
	);
	edit(visual("notes", "visual.json"), (value) =>
		value.replace('"position"', '"parentGroupName": "box",\r\n  "position"'),
	);
};

it.each([
	["a renamed folder", "box", "other", "Visual or page folder differs from its name"],
	["a bad name", "bad.group", "bad.group", 'The name "bad.group" must use only letters, digits, "_" or "-"'],
])("keeps the typed children of a group with %s as unmapped files", (_, name, folder, reason) => {
	addGroup();
	const typed = importProject();
	expect(typed).not.toContain("Visual first/");
	rmSync(out, { recursive: true });
	renameSync(visual("box"), visual(folder));
	edit(visual(folder, "visual.json"), (value) => value.replace('"name": "box"', `"name": "${name}"`));
	edit(visual("notes", "visual.json"), (value) =>
		value.replace('"parentGroupName": "box"', `"parentGroupName": "${name}"`),
	);
	const stdout = importProject();
	expect(stdout).toContain(`Visual first/${name}: ${reason}`);
	expect(stdout).toContain(`Visual first/notes: Its group "${name}" is not placed`);
	expect(existsSync(join(out, "pages", "first", "visuals", "notes.ts"))).toBe(false);
	const fromProject = tree("--pbip", project);
	expect(fromProject).toContain("visual (textbox, notes, -) [raw]");
	expect(fromProject).toBe(tree("-c", config));
});

it("keeps a page raw when its visualInteractions name a visual that is not placed", () => {
	edit(definition("pages", "second", "page.json"), (value) => {
		const parsed: unknown = JSON.parse(value);
		const entries = Predicate.isReadonlyObject(parsed) ? Object.entries(parsed) : [];
		return toJson(
			Object.fromEntries([
				...entries,
				["visualInteractions", [{ source: "1-card", target: "1_card", type: "NoFilter" }]],
			]),
		);
	});
	expect(importProject()).not.toContain("Page second");
	rmSync(out, { recursive: true });
	const pageVisual = (...path: ReadonlyArray<string>) => definition("pages", "second", "visuals", ...path);
	renameSync(pageVisual("1-card"), pageVisual("moved"));
	const stdout = importProject();
	expect(stdout).toContain("Visual second/1-card: Visual or page folder differs from its name");
	expect(stdout).toContain(
		'Page second: visualInteractions names "1-card", which is not a placed visual on this page',
	);
	expect(readFileSync(join(out, "pages", "second", "page.ts"), "utf8")).toContain(
		'file: new URL("../../assets/report/definition/pages/second/page.json", import.meta.url)',
	);
	const fromProject = tree("--pbip", project);
	expect(fromProject).toContain("page (-, second, second) [raw]");
	expect(fromProject).toBe(tree("-c", config));
});
