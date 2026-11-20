import { expect, it } from "vite-plus/test";

import { checkConfig } from "./check.ts";
import { defineConfig } from "./config.ts";
import { SchemaUrl } from "./schemas/schema-url.ts";

it("warns about unsupported font sizes without rejecting the config", () => {
	const sizes = [8.5, "10.5pt", "21.3333px"];
	const config = defineConfig({
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
			definition: { $schema: SchemaUrl.report["3.3.0"], themeCollection: {} },
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
							visual: {
								visualType: "textbox",
								visualContainerObjects: { title: sizes.map((fontSize) => ({ properties: { fontSize } })) },
							},
						},
					],
				},
			],
		},
	});

	const { errors, warnings } = checkConfig(config);
	expect(errors).toEqual([]);
	expect(warnings).toEqual(
		sizes.map(
			(size) =>
				`[WARN] check: page "summary" visual "notes": font size ${JSON.stringify(size)} is not a whole number from 8 to 60`,
		),
	);
});

it("warns that a raw pages.json or bookmarks.json sets the order instead of the config", () => {
	const file = new URL("file:///project/Example.Report/definition/pages/pages.json");
	const config = defineConfig({
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
			definition: { $schema: SchemaUrl.report["3.3.0"], themeCollection: {} },
			version: { $schema: SchemaUrl.version["1.0.0"], version: "2.0.0" },
			pagesMetadata: file,
			pages: [],
			bookmarks: { file: new URL("bookmarks/bookmarks.json", file), items: [] },
		},
	});

	const { errors, warnings } = checkConfig(config);
	expect(errors).toEqual([]);
	expect(warnings).toEqual([
		"[WARN] check: report: pagesMetadata is a file, so that file sets the page order and the active page, not report.pages",
		"[WARN] check: report: bookmarks is a file, so that file sets the bookmark order and groups, not bookmarks.items",
	]);
});
