import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vite-plus/test";

vi.setConfig({ testTimeout: 30_000 });

const main = fileURLToPath(new URL("../main.ts", import.meta.url));

const sourceConfig = `import { defineConfig } from "@pbirkit/core/config";
import { SchemaUrl } from "@pbirkit/core/schema-url";

const reportVersionAtImport = { visual: "2.13.0", page: "2.1.0", report: "3.3.0" };

export default defineConfig({
	name: "Example",
	pbip: { version: "1.0" },
	report: {
		logicalId: "b045d170-d2e9-4ade-bbfd-ca34ce61654e",
		platform: { $schema: SchemaUrl.platform["2.1.0"], version: "2.0" },
		pbir: {
			$schema: SchemaUrl.pbir["2.0.0"],
			version: "4.0",
			datasetReference: { byConnection: { connectionString: "semantic-model" } },
		},
		definition: {
			$schema: SchemaUrl.report["3.3.0"],
			themeCollection: {
				customTheme: { name: "Brand.json", type: "RegisteredResources", reportVersionAtImport },
			},
			resourcePackages: [
				{
					name: "RegisteredResources",
					type: "RegisteredResources",
					items: [{ name: "Brand.json", path: "Theme.json", type: "Image" }],
				},
			],
		},
		version: { $schema: SchemaUrl.version["1.0.0"], version: "2.0.0" },
		pagesMetadata: { $schema: SchemaUrl.pages["1.0.0"], activePageName: "summary" },
		pages: [
			{
				$schema: SchemaUrl.page["2.1.0"],
				name: "summary",
				displayName: "Summary",
				displayOption: "FitToPage",
				visuals: [
					{
						$schema: SchemaUrl.visual["2.13.0"],
						name: "notes",
						position: { x: 0, y: 0, width: 100, height: 100 },
						visual: { visualType: "textbox" },
					},
				],
			},
		],
		bookmarks: {
			$schema: SchemaUrl.bookmarksMetadata["1.0.0"],
			items: [
				{
					$schema: SchemaUrl.bookmark["2.1.0"],
					name: "overview",
					displayName: "Overview",
					options: { targetVisualNames: ["absent"] },
					explorationState: { version: "1.0", activeSection: "summary", sections: {} },
				},
			],
		},
		desktopOwned: ["desktop/"],
		files: { "StaticResources/RegisteredResources/Theme.json": new URL("./theme.json", import.meta.url) },
	},
});
`;

const run = (cwd: string, args: ReadonlyArray<string>) =>
	spawnSync(process.execPath, [main, ...args], { cwd, encoding: "utf8" });

const replaceInFile = (file: string, from: string, to: string) => {
	const text = readFileSync(file, "utf8");
	expect(text).toContain(from);
	writeFileSync(file, text.replace(from, to));
};

const WARNING = 'target visual "absent" is not a visual on page "summary"';
const report = "Example.Report";
const page = `${report}/definition/pages/summary/page.json`;
const visual = `${report}/definition/pages/summary/visuals/notes/visual.json`;
const bookmark = `${report}/definition/bookmarks/overview.bookmark.json`;
const theme = `${report}/StaticResources/RegisteredResources/Theme.json`;

const root = mkdtempSync(join(tmpdir(), "pbirkit-diff-"));
const config = join(root, "pbirkit.config.ts");
const built = join(root, "built");
const target = join(root, "dist");

const diff = (...args: ReadonlyArray<string>) => run(root, ["diff", ...args]);

beforeAll(() => {
	writeFileSync(config, sourceConfig);
	writeFileSync(join(root, "theme.json"), '{"name":"Brand"}');
	expect(existsSync(join(root, "node_modules"))).toBe(false);
	expect(spawnSync("git", ["init", "-q", root]).status).toBe(0);
	const build = run(root, ["build"]);
	expect(build.status, build.stderr).toBe(0);
	expect(build.stderr).toContain(WARNING);
	cpSync(target, built, { recursive: true });
	replaceInFile(
		config,
		'files: { "StaticResources',
		'files: { "desktop/different.json": new URL("./theme.json", import.meta.url), "StaticResources',
	);
});

afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
	rmSync(target, { recursive: true, force: true });
	cpSync(built, target, { recursive: true });
	mkdirSync(join(target, report, "desktop"));
	writeFileSync(join(target, report, "desktop", "different.json"), '{"target":true}');
	writeFileSync(join(target, ".gitignore"), "user rules\n");
	writeFileSync(join(target, "unrelated.txt"), "outside the project");
});

it("compares only project files that the config owns, without local dependencies", () => {
	const clean = diff();
	expect(clean.status, clean.stderr).toBe(0);
	expect(clean.stdout.trim()).toMatch(/^No differences in \d+ files\.$/u);
	expect(clean.stderr).toBe("");
});

it("ignores JSON formatting unless --bytes is set, and shows warnings only with --warnings", () => {
	replaceInFile(join(target, visual), '"x": 0,', '"x": 0.0,');
	const semantic = diff("--warnings", "--visual", "notes");
	expect(semantic.status, semantic.stderr).toBe(0);
	expect(semantic.stdout.trim()).toBe("No differences in 1 file.");
	expect(semantic.stderr).toContain(WARNING);
	const bytes = diff("--bytes", "--visual", "notes");
	expect(bytes.status, bytes.stderr).toBe(1);
	expect(bytes.stdout).toContain(`changed  ${visual}`);
	expect(bytes.stderr).toBe("");
});

it("scopes the comparison to the selected pages, visuals, bookmarks and themes", () => {
	replaceInFile(join(target, visual), '"x": 0,', '"x": 1,');
	replaceInFile(join(target, page), '"displayName": "Summary"', '"displayName": "Changed page"');
	replaceInFile(join(target, bookmark), '"displayName": "Overview"', '"displayName": "Changed bookmark"');
	replaceInFile(join(target, theme), '"Brand"', '"Changed theme"');

	const scopes = [
		[
			["--page", "summary"],
			[page, visual],
		],
		[["--visual", "summary/notes"], [visual]],
		[["--bookmark", "overview"], [bookmark]],
		[["--theme", "Brand.json"], [theme]],
		[
			["--page", "summary", "--bookmark", "overview", "--theme", "Brand.json"],
			[bookmark, page, visual, theme],
		],
	] as const;
	for (const [args, paths] of scopes) {
		const result = diff(...args);
		expect(result.status, result.stderr).toBe(1);
		expect(result.stdout.split("\n").filter((line) => line.startsWith("changed  "))).toEqual(
			paths.map((path) => `changed  ${path}`),
		);
	}
});

it.each([
	[["--theme", "absent"], '[ERROR] diff: --theme "absent" matched no files'],
	[["--target", "absent"], "[ERROR] diff: target folder absent does not exist"],
	[["--target", "theme.json"], "theme.json"],
	[["--config", "absent.ts"], "absent.ts"],
	[["--config", "dist"], "dist"],
])("exits with code 2 for %j", (args, message) => {
	const result = diff(...args);
	expect(result.status, result.stderr).toBe(2);
	expect(result.stderr).toContain(message);
});
