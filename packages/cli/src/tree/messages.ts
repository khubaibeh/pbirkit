import { Match } from "effect";

import type { BookmarkGroupNode, BookmarkNode, PageNode, ReportTree, VisualNode } from "@pbirkit/core/tree";

import type { ConfigLoadError, ConfigShapeError } from "../build/errors.ts";

interface Line {
	readonly text: string;
	readonly children: ReadonlyArray<Line>;
}

const count = (total: number, noun: string): string => `${total} ${noun}${total === 1 ? "" : "s"}`;

const id = (name: string): string => (/^[^\s"\\,()]+$/u.test(name) ? name : JSON.stringify(name));

const label = (text: string | undefined): string =>
	text === undefined || text === "" ? "-" : /\p{Cc}/u.test(text) ? JSON.stringify(text) : text;

const entry = (type: string, subtype: string | undefined, name: string, title: string | undefined): string =>
	`${type} (${subtype ?? "-"}, ${id(name)}, ${label(title)})`;

const notes = (...items: ReadonlyArray<string | false | undefined>): string => {
	const shown = items.filter((item): item is string => typeof item === "string");
	return shown.length === 0 ? "" : ` [${shown.join(", ")}]`;
};

const visualLine = (node: VisualNode): Line => ({
	text: `${entry(node.kind, node.visualType, node.name, node.title)}${notes(node.hidden === true && "hidden")}`,
	children: (node.children ?? []).map((child) => visualLine(child)),
});

const pageLine = (node: PageNode): Line => ({
	text: `${entry("page", node.type?.toLowerCase(), node.name, node.displayName)}${notes(node.hidden === true && "hidden")}`,
	children: node.visuals.map((visual) => visualLine(visual)),
});

const pageNote = (node: BookmarkNode): string =>
	node.switchesPage
		? ` -> ${id(node.page)}${notes(!node.pageExists && "no such page")}`
		: notes(`saved on ${id(node.page)}`, "does not switch page", !node.pageExists && "no such page");

const bookmarkLine = (node: BookmarkNode | BookmarkGroupNode): Line =>
	node.kind === "group"
		? {
				text: entry("group", undefined, node.name, node.displayName),
				children: node.children.map((child) => bookmarkLine(child)),
			}
		: { text: `${entry("bookmark", undefined, node.name, node.displayName)}${pageNote(node)}`, children: [] };

const render = (lines: ReadonlyArray<Line>, indent: string): ReadonlyArray<string> =>
	lines.flatMap((line, index) => {
		const last = index === lines.length - 1;
		return [
			`${indent}${last ? "└─ " : "├─ "}${line.text}`,
			...render(line.children, `${indent}${last ? "   " : "│  "}`),
		];
	});

const visualCount = (nodes: ReadonlyArray<VisualNode>): number =>
	nodes.reduce(
		(total, node) => total + (node.kind === "visual" ? 1 : 0) + visualCount(node.children ?? []),
		0,
	);

const bookmarkCount = (nodes: ReadonlyArray<BookmarkNode | BookmarkGroupNode>): number =>
	nodes.reduce((total, node) => total + (node.kind === "group" ? node.children.length : 1), 0);

export const treeMessage = (tree: ReportTree): string => {
	const visuals = tree.pages.reduce((total, page) => total + visualCount(page.visuals), 0);
	return [
		`${tree.name}: ${count(tree.pages.length, "page")}, ${count(visuals, "visual")}, ${count(bookmarkCount(tree.bookmarks), "bookmark")}`,
		"pages",
		...render(
			tree.pages.map((page) => pageLine(page)),
			"",
		),
		...(tree.bookmarks.length === 0
			? []
			: [
					"bookmarks",
					...render(
						tree.bookmarks.map((node) => bookmarkLine(node)),
						"",
					),
				]),
	].join("\n");
};

export const errorMessage: (error: ConfigLoadError | ConfigShapeError) => string = Match.valueTags({
	ConfigLoadError: ({ file, detail }) => `[ERROR] tree: cannot load ${file}: ${detail}`,
	ConfigShapeError: ({ file, detail }) => `[ERROR] tree: ${file} is not a valid config\n${detail}`,
});
