import { Literals } from "effect/Schema";

import type { BookmarksMetadata } from "#schemas/bookmarks-metadata/1.0.0.ts";
import type { PagesMetadataItem } from "#schemas/pages";

import type { BookmarkGroupNode, BookmarkNode } from "./bookmarks.ts";
import { bookmarksOf } from "./bookmarks.ts";
import type { PageNode } from "./pages.ts";
import { flattenVisuals, pagesOf } from "./pages.ts";
import type { ResourceNode } from "./resources.ts";
import { resourcesOf } from "./resources.ts";
import type { IndexedFile, ReportFiles } from "./shared.ts";
import { parent } from "./shared.ts";

export type { BookmarkGroupNode, BookmarkNode } from "./bookmarks.ts";
export type { PageNode, VisualNode } from "./pages.ts";
export { flattenVisuals } from "./pages.ts";
export type { ResourceData, ResourceNode } from "./resources.ts";
export type { Content, IndexedFile } from "./shared.ts";
export { decoded } from "./shared.ts";

export interface ReportTree {
	readonly name: string;
	readonly report: string;
	readonly files: ReadonlyArray<string>;
	readonly pagesMetadata: IndexedFile<PagesMetadataItem>;
	readonly pages: ReadonlyArray<PageNode>;
	readonly bookmarksMetadata: IndexedFile<BookmarksMetadata> | undefined;
	readonly bookmarks: ReadonlyArray<BookmarkNode | BookmarkGroupNode>;
	readonly resources: ReadonlyArray<ResourceNode>;
}

export interface ReportIndexInput {
	readonly name: string;
	readonly report: string;
	readonly paths: ReadonlyArray<string>;
	readonly text: (path: string) => string | undefined;
	readonly raw?: (path: string) => boolean;
}

const parseJson = (text: string | undefined): unknown => {
	if (text === undefined) return undefined;
	try {
		const value: unknown = JSON.parse(text.replace(/^\uFEFF/u, ""));
		return value;
	} catch {
		return undefined;
	}
};

const reportFiles = ({ report, paths, text, raw = () => false }: ReportIndexInput): ReportFiles => {
	const known = new Set(paths);
	const parsed = new Map<string, unknown>();
	return {
		report,
		paths,
		text,
		raw,
		has: (path) => known.has(path),
		json: (path) => {
			if (!parsed.has(path)) parsed.set(path, parseJson(text(path)));
			return parsed.get(path);
		},
	};
};

export const indexReport = (input: ReportIndexInput): ReportTree => {
	const files = reportFiles(input);
	const { pages, pagesMetadata } = pagesOf(files);
	return {
		name: input.name,
		report: input.report,
		files: input.paths,
		pagesMetadata,
		pages,
		...bookmarksOf(files, new Set(pages.map((page) => page.name))),
		resources: resourcesOf(files),
	};
};

export const ReportSelector = Literals(["page", "visual", "bookmark", "theme"]);

export type ReportSelector = typeof ReportSelector.Type;

const under = (tree: ReportTree, file: string): ReadonlyArray<string> =>
	tree.files.filter((path) => path.startsWith(`${parent(file)}/`));

const SELECTORS: Readonly<Record<ReportSelector, (tree: ReportTree, name: string) => ReadonlyArray<string>>> =
	{
		page: (tree, name) =>
			tree.pages.filter((page) => page.name === name).flatMap((page) => under(tree, page.path)),
		visual: (tree, name) =>
			tree.pages.flatMap((page) =>
				flattenVisuals(page.visuals)
					.filter((visual) => name === visual.name || name === `${page.name}/${visual.name}`)
					.flatMap((visual) => under(tree, visual.path)),
			),
		bookmark: (tree, name) =>
			tree.bookmarks
				.flatMap((node) =>
					node.kind === "group" && node.name === name
						? node.children
						: (node.kind === "group" ? node.children : [node]).filter((child) => child.name === name),
				)
				.map((node) => node.path)
				.filter((path) => tree.files.includes(path)),
		theme: (tree, name) =>
			tree.resources
				.filter((node) => node.kind === "theme" && node.name === name)
				.flatMap((node) => node.files.filter((path) => tree.files.includes(path))),
	};

export const selectedPaths = (tree: ReportTree, kind: ReportSelector, name: string): ReadonlyArray<string> =>
	SELECTORS[kind](tree, name);
