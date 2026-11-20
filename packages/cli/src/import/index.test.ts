import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vite-plus/test";

const main = fileURLToPath(new URL("../main.ts", import.meta.url));
const core = fileURLToPath(new URL("../../../core", import.meta.url));

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

it("imports a PBIP build with split modules, model assets and raw report files", () => {
	const root = mkdtempSync(join(tmpdir(), "pbirkit-import-"));
	try {
		const author = join(root, "author");
		mkdirSync(join(author, "node_modules", "@pbirkit"), { recursive: true });
		symlinkSync(core, join(author, "node_modules", "@pbirkit", "core"), "junction");
		mkdirSync(join(author, "model"));
		writeFileSync(join(author, "model", "model.tmdl"), "model Model\n");
		writeFileSync(join(author, "model", "obsolete.tmdl"), "");
		writeFileSync(
			join(author, "logo.png"),
			Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axGjS0AAAAASUVORK5CYII=",
				"base64",
			),
		);
		writeFileSync(join(author, "extra.txt"), "Unmapped\n");
		writeFileSync(join(author, "pbirkit.config.ts"), sourceConfig);
		expect(spawnSync("git", ["init", "-q", author]).status).toBe(0);

		const build = run(author, ["build"]);
		expect(build.status, build.stderr).toBe(0);

		const project = join(author, "dist");
		mkdirSync(join(project, "Export"));
		writeFileSync(join(project, "Export", "unrelated.csv"), "unrelated\n");
		const imported = run(root, ["import", project]);
		expect(imported.status, imported.stderr).toBe(0);
		expect(imported.stdout).toContain("import: verified 23 files");
		expect(imported.stdout).toContain("extra.txt: Copied 1 unmapped file");
		const out = join(root, "Example.pbirkit");

		const config = readFileSync(join(out, "pbirkit.config.ts"), "utf8");
		expect(config).toContain("pages: [\n\t\t\t_second,\n\t\t\t_first,");
		expect(config).toContain("children: [\n\t\t\t\t\t\t_overview,\n\t\t\t\t\t\t_detail,");
		expect(config).toContain('kind: "customTheme"');
		expect(config).toContain('kind: "customVisual"');
		expect(config).toContain('declare module "@pbirkit/core/register"');
		expect(config).toMatch(/visuals: \[\s*\{\s*guid: "FileVisual"/u);
		expect(config).toMatch(/builtinVisuals: \[\s*"PublicVisual"/u);
		expect(config).toContain(
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
		mkdirSync(join(out, "node_modules", "@pbirkit"), { recursive: true });
		symlinkSync(core, join(out, "node_modules", "@pbirkit", "core"), "junction");
		const diff = run(root, ["diff", "-c", join(out, "pbirkit.config.ts"), "--target", project]);
		expect(diff.status, diff.stderr).toBe(0);
		expect(diff.stdout).toContain("No differences.");

		const fromConfig = run(root, ["tree", "-c", join(out, "pbirkit.config.ts")]);
		expect(fromConfig.status, fromConfig.stderr).toBe(0);
		expect(fromConfig.stdout).toContain("Example: 2 pages, 3 visuals, 2 bookmarks");
		for (const source of [project, join(project, "Example.pbip")]) {
			const fromProject = run(root, ["tree", "--pbip", source]);
			expect(fromProject.status, fromProject.stderr).toBe(0);
			expect(fromProject.stdout).toBe(fromConfig.stdout);
		}
		const conflict = run(root, ["tree", "--pbip", project, "-c", join(out, "pbirkit.config.ts")]);
		expect(conflict.status).toBe(1);
		expect(conflict.stderr).toContain("--config and --pbip are mutually exclusive");

		const protectedOut = run(root, ["import", project]);
		expect(protectedOut.status).toBe(1);
		expect(protectedOut.stderr).toContain("folder is not empty");

		const original = join(project, "Example.pbip");
		copyFileSync(original, join(project, "Other.pbip"));
		const ambiguous = run(project, ["import"]);
		expect(ambiguous.status).toBe(1);
		expect(ambiguous.stderr).toContain("Specify the .pbip file");
		const ambiguousTree = run(project, ["tree", "--pbip", "."]);
		expect(ambiguousTree.status).toBe(1);
		expect(ambiguousTree.stderr).toBe(ambiguous.stderr);

		const report = resolve(project, "Example.Report", "definition", "report.json");
		const reportContents = readFileSync(report, "utf8");
		writeFileSync(report, reportContents.replace('"type": "Image"', '"id": 5, "type": "Image"'));
		rmSync(join(project, "Example.SemanticModel", "definition", "obsolete.tmdl"));
		const visual = join(
			project,
			"Example.Report",
			"definition",
			"pages",
			"first",
			"visuals",
			"notes",
			"visual.json",
		);
		writeFileSync(visual, readFileSync(visual, "utf8").replace("/2.13.0/", "/9.0.0/"));
		const forced = run(root, ["import", original, "--force"]);
		expect(forced.status, forced.stderr).toBe(0);
		expect(forced.stdout).toContain("Resource packages: Kept the original package list");
		expect(forced.stdout).toContain("import: verified 22 files");
		expect(forced.stdout).toContain("definition/pages: Copied 1 unmapped file");
		expect(readFileSync(join(out, "pbirkit.config.ts"), "utf8")).toContain("resourcePackages: [");

		const platform = join(project, "Example.Report", ".platform");
		const platformContents = readFileSync(platform, "utf8");
		writeFileSync(platform, platformContents.replace('"displayName": "Example"', '"displayName": "Renamed"'));
		const changed = run(root, ["import", original, "--force"]);
		expect(changed.status).toBe(1);
		expect(changed.stdout).toContain("/metadata/displayName");
		expect(readFileSync(join(out, "pbirkit.config.ts"), "utf8")).toContain("resourcePackages: [");

		writeFileSync(
			report,
			reportContents.replace('"themeCollection"', '"unsupported": true, "themeCollection"'),
		);
		const invalid = run(root, ["import", original, "-o", "invalid"]);
		expect(invalid.status).toBe(1);
		expect(invalid.stdout).toContain("import: wrote invalid/pbirkit.config.ts");
		expect(invalid.stderr).toContain("not a valid config");
		expect(readFileSync(join(root, "invalid", "pbirkit.config.ts"), "utf8")).toContain("unsupported: true");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}, 30_000);
