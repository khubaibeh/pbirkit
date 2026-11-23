import { Result } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { toJson } from "../build/json.ts";
import { SchemaUrl } from "../schemas/schema-url.ts";
import { flattenVisuals, indexReport, selectedPaths } from "./index.ts";
import type { Content, ReportTree } from "./index.ts";

const REPORT = "Sales.Report";
const pages = `${REPORT}/definition/pages`;
const bookmarks = `${REPORT}/definition/bookmarks`;

const indexOf = (files: Readonly<Record<string, unknown>>): ReportTree => {
	const texts = new Map(
		Object.entries(files).map(([path, value]) => [path, typeof value === "string" ? value : toJson(value)]),
	);
	return indexReport({
		name: "Sales",
		report: REPORT,
		paths: [...texts.keys()],
		text: (path) => texts.get(path),
	});
};

const page = (name: string) => ({
	$schema: SchemaUrl.page["2.1.0"],
	name,
	displayName: name.toUpperCase(),
	displayOption: "FitToPage",
});

const visual = (name: string, fields: object = {}) => ({
	$schema: SchemaUrl.visual["2.13.0"],
	name,
	position: { x: 0, y: 0, width: 10, height: 10 },
	visual: { visualType: "textbox" },
	...fields,
});

const group = (name: string, parentGroupName?: string) => {
	const { visual: _visual, ...rest } = visual(name, { parentGroupName });
	return { ...rest, visualGroup: { displayName: name, groupMode: "ScaleMode" } };
};

const bookmark = (name: string, activeSection = "first") => ({
	$schema: SchemaUrl.bookmark["2.1.0"],
	name,
	displayName: name,
	explorationState: { version: "1.0", activeSection, sections: {} },
});

const pagesJson = (pageOrder: ReadonlyArray<string>) => ({ $schema: SchemaUrl.pages["1.0.0"], pageOrder });

const failure = (content: Content<unknown> | undefined): string | undefined =>
	content !== undefined && Result.isFailure(content) ? content.failure : undefined;

describe("pages", () => {
	it("follows pageOrder and appends unlisted page folders", () => {
		const tree = indexOf({
			[`${pages}/pages.json`]: pagesJson(["second", "first"]),
			[`${pages}/first/page.json`]: page("first"),
			[`${pages}/second/page.json`]: page("second"),
			[`${pages}/third/page.json`]: page("third"),
		});

		expect(tree.pages.map((node) => node.name)).toEqual(["second", "first", "third"]);
		expect(tree.pages.every((node) => node.placed && Result.isSuccess(node.content))).toBe(true);
		expect(failure(tree.pagesMetadata.content)).toBe("pageOrder differs from the page folders");
	});

	it("marks a page whose folder differs from its name, and its visuals, as not placed", () => {
		const tree = indexOf({
			[`${pages}/pages.json`]: pagesJson(["first"]),
			[`${pages}/folder/page.json`]: page("first"),
			[`${pages}/folder/visuals/a/visual.json`]: visual("a"),
		});
		const [node] = tree.pages;

		expect(node?.placed).toBe(false);
		expect(failure(node?.content ?? Result.succeed(0))).toBe("Page folder differs from its name");
		expect(node?.visuals.map((item) => [item.name, item.placed, failure(item.content)])).toEqual([
			["a", false, "Visual or page folder differs from its name"],
		]);
		expect(failure(tree.pagesMetadata.content)).toBe("pageOrder differs from the page folders");
	});

	it("reports a page listed in pageOrder without a page file", () => {
		const tree = indexOf({ [`${pages}/pages.json`]: pagesJson(["gone"]) });

		expect(tree.pages.map((node) => [node.name, node.placed, failure(node.content)])).toEqual([
			["gone", false, "Page file is missing"],
		]);
	});

	it("rejects duplicate pageOrder entries and a pageOrder that is not a list of names", () => {
		const files = { [`${pages}/first/page.json`]: page("first") };

		expect(
			failure(
				indexOf({ ...files, [`${pages}/pages.json`]: pagesJson(["first", "first"]) }).pagesMetadata.content,
			),
		).toBe("pageOrder differs from the page folders");
		expect(
			failure(
				indexOf({ ...files, [`${pages}/pages.json`]: { $schema: SchemaUrl.pages["1.0.0"], pageOrder: [1] } })
					.pagesMetadata.content,
			),
		).toBe("Missing or invalid pageOrder");
	});
});

const visualsIndex = (entries: Readonly<Record<string, unknown>>) =>
	indexOf({
		[`${pages}/pages.json`]: pagesJson(["first"]),
		[`${pages}/first/page.json`]: page("first"),
		...Object.fromEntries(
			Object.entries(entries).map(([folder, value]) => [
				`${pages}/first/visuals/${folder}/visual.json`,
				value,
			]),
		),
	}).pages[0]?.visuals ?? [];

const shape = (nodes: ReturnType<typeof visualsIndex>): unknown =>
	nodes.map((node) => (node.children.length === 0 ? node.name : { [node.name]: shape(node.children) }));

describe("visuals", () => {
	it("keeps visuals in a group cycle or with an unknown parent at the top level", () => {
		const nodes = visualsIndex({
			x: group("x", "y"),
			y: group("y", "x"),
			z: visual("z", { parentGroupName: "none" }),
		});

		expect(shape(nodes)).toEqual(["z", { x: ["y"] }]);
	});

	it("does not nest under a parent name that two visuals share", () => {
		const nodes = visualsIndex({ g1: group("g"), g2: group("g"), a: visual("a", { parentGroupName: "g" }) });

		expect(flattenVisuals(nodes).map((node) => node.children.length)).toEqual([0, 0, 0]);
	});

	it("types only visuals with a known schema, known properties and an exact rebuild", () => {
		const nodes = visualsIndex({
			plain: visual("plain"),
			extra: visual("extra", { futureProperty: true }),
			future: { ...visual("future"), $schema: "https://example.com/visual/9.0.0/schema.json" },
			spaced: JSON.stringify(visual("spaced")),
		});

		expect(Object.fromEntries(nodes.map((node) => [node.name, failure(node.content)]))).toEqual({
			plain: undefined,
			extra: "Unsupported visual schema or properties",
			future: "Unknown visual $schema",
			spaced: "The visual JSON does not rebuild to the same text",
		});
	});
});

const bookmarksJson = (items: ReadonlyArray<unknown>) => ({
	$schema: SchemaUrl.bookmarksMetadata["1.0.0"],
	items,
});

describe("bookmarks", () => {
	it("keeps bookmarks.json raw when its entries and the bookmark files do not line up", () => {
		const cases = [
			[
				bookmarksJson([{ name: "a" }, { name: "gone" }]),
				"Some listed bookmarks have no valid name or no file at the expected path",
			],
			[bookmarksJson([]), "Some bookmark files are not listed in bookmarks.json"],
			[bookmarksJson([{ name: "a" }, { name: "a" }]), "A bookmark is listed more than once"],
			[
				bookmarksJson([{ name: "g", displayName: "G", children: ["a"], extra: 1 }]),
				"Unsupported bookmarks metadata schema or properties",
			],
		] as const;

		for (const [json, reason] of cases) {
			const tree = indexOf({
				[`${bookmarks}/bookmarks.json`]: json,
				[`${bookmarks}/a.bookmark.json`]: bookmark("a"),
			});
			expect(failure(tree.bookmarksMetadata?.content)).toBe(reason);
		}
	});
});

const reportJson = (themeCollection: object, resourcePackages: ReadonlyArray<object>) => ({
	[`${REPORT}/definition/report.json`]: { themeCollection, resourcePackages },
});

const fill = (color: string) => ({ solid: { color } });

const baseJson = {
	$schema: "https://example.com/theme.json",
	name: "Base",
	textClasses: { label: { fontSize: 10.5 } },
	visualStyles: { "*": { "*": { categoryAxis: [{ fontSize: 10.5 }] } } },
};

const brandJson = {
	name: "Brand",
	visualStyles: {
		"*": { "*": { outspacePane: [{ backgroundColor: fill("background"), borderColor: fill("#FFFFFF00") }] } },
	},
};

describe("resources", () => {
	it("maps each resource package item to a typed resource or explains why not", () => {
		const tree = indexOf({
			...reportJson({ customTheme: { name: "Brand.json", type: "RegisteredResources" } }, [
				{
					name: "SharedResources",
					type: "SharedResources",
					items: [{ name: "Base", path: "BaseThemes/Base.json", type: "BaseTheme" }],
				},
				{
					name: "RegisteredResources",
					type: "RegisteredResources",
					items: [
						{ name: "Brand.json", path: "Brand.json", type: "Image" },
						{ name: "logo.png", path: "logo.png", type: "Image" },
						{ name: "other.json", path: "elsewhere.json", type: "CustomTheme" },
					],
				},
				{
					name: "Visual1",
					type: "CustomVisual",
					items: [{ name: "Visual1.pbiviz.json", path: "Visual1.pbiviz.json", type: "CustomVisualMetadata" }],
				},
			]),
			[`${REPORT}/StaticResources/SharedResources/BaseThemes/Base.json`]: baseJson,
			[`${REPORT}/StaticResources/RegisteredResources/Brand.json`]: brandJson,
			[`${REPORT}/StaticResources/RegisteredResources/logo.png`]: "png",
			[`${REPORT}/CustomVisuals/Visual1/resources/Visual1.pbiviz.json`]: "{}",
		});

		expect(
			tree.resources.map((node) => [
				node.kind,
				node.name,
				Result.isSuccess(node.content) ? node.content.success : node.content.failure,
			]),
		).toEqual([
			["theme", "Base", { kind: "baseTheme", name: "Base", theme: baseJson }],
			[
				"theme",
				"Brand.json",
				{ kind: "customTheme", name: "Brand.json", itemType: "Image", theme: brandJson },
			],
			["image", "logo.png", { kind: "image", name: "logo.png" }],
			["theme", "other.json", "Unsupported resource package item"],
			["customVisual", "Visual1", { kind: "customVisual", guid: "Visual1", source: "file" }],
		]);
	});
});

describe("selectedPaths", () => {
	const tree = indexOf({
		[`${pages}/pages.json`]: pagesJson(["first"]),
		[`${pages}/first/page.json`]: page("first"),
		[`${pages}/first/visuals/a/visual.json`]: visual("a"),
		[`${bookmarks}/bookmarks.json`]: {
			$schema: SchemaUrl.bookmarksMetadata["1.0.0"],
			items: [{ name: "g", displayName: "G", children: ["b"] }],
		},
		[`${bookmarks}/b.bookmark.json`]: bookmark("b"),
	});

	it("selects the files of a page, a visual and a bookmark group", () => {
		expect(selectedPaths(tree, "page", "first")).toEqual([
			`${pages}/first/page.json`,
			`${pages}/first/visuals/a/visual.json`,
		]);
		expect(selectedPaths(tree, "visual", "first/a")).toEqual([`${pages}/first/visuals/a/visual.json`]);
		expect(selectedPaths(tree, "bookmark", "g")).toEqual([`${bookmarks}/b.bookmark.json`]);
		expect(selectedPaths(tree, "bookmark", "b")).toEqual([`${bookmarks}/b.bookmark.json`]);
		expect(selectedPaths(tree, "theme", "none")).toEqual([]);
	});
});

const nameRule = (name: string) => `The name "${name}" must use only letters, digits, "_" or "-"`;

describe("names", () => {
	it("leaves pages, visuals, bookmarks and groups with invalid names unplaced", () => {
		const tree = indexOf({
			[`${pages}/pages.json`]: pagesJson(["first", "bad.page"]),
			[`${pages}/first/page.json`]: page("first"),
			[`${pages}/first/visuals/my.visual/visual.json`]: visual("my.visual"),
			[`${pages}/bad.page/page.json`]: page("bad.page"),
			[`${bookmarks}/bookmarks.json`]: {
				$schema: SchemaUrl.bookmarksMetadata["1.0.0"],
				items: [{ name: "bad group", displayName: "Group", children: ["bad.mark"] }],
			},
			[`${bookmarks}/bad.mark.bookmark.json`]: bookmark("bad.mark"),
		});
		const [first, bad] = tree.pages;
		const [bookmarkGroup] = tree.bookmarks;
		expect(first?.visuals[0]?.placed).toBe(false);
		expect(failure(first?.visuals[0]?.content)).toBe(nameRule("my.visual"));
		expect(bad?.placed).toBe(false);
		expect(failure(bad?.content)).toBe(nameRule("bad.page"));
		expect(failure(tree.pagesMetadata.content)).toBe("pageOrder differs from the page folders");
		expect(failure(bookmarkGroup?.content)).toBe(nameRule("bad group"));
		expect(bookmarkGroup?.kind === "group" ? failure(bookmarkGroup.children[0]?.content) : undefined).toBe(
			nameRule("bad.mark"),
		);
	});
});
