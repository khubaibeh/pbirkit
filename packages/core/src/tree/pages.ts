import { Option, Predicate, Result } from "effect";
import { Array as ArraySchema, String, decodeUnknownOption } from "effect/Schema";
import { omit } from "effect/Struct";

import { AnyPageFile } from "#schemas/page";
import { PagesMetadataItem } from "#schemas/pages";
import { SchemaUrl } from "#schemas/schema-url.ts";
import { AnyVisual } from "#schemas/visual";

import { insideProject } from "../build/shared.ts";
import { textOf } from "../expr/literal.ts";
import { at } from "../expr/query.ts";
import { nameFailure } from "../name.ts";
import type { Content, IndexedFile, ReportFiles } from "./shared.ts";
import { basename, decoded, fileContent, list, nameOf, parent, sameList, string, strings } from "./shared.ts";

export interface VisualNode extends IndexedFile<AnyVisual> {
	readonly kind: "visual" | "group";
	readonly name: string;
	readonly placed: boolean;
	readonly visualType?: string;
	readonly title?: string;
	readonly hidden: boolean;
	readonly children: ReadonlyArray<VisualNode>;
}

export interface PageNode extends IndexedFile<AnyPageFile> {
	readonly name: string;
	readonly placed: boolean;
	readonly displayName: string;
	readonly type?: string;
	readonly hidden: boolean;
	readonly visuals: ReadonlyArray<VisualNode>;
}

interface PageFolder {
	readonly folder: string;
	readonly name: string;
	readonly path: string;
	readonly value: unknown;
	readonly visuals: ReadonlyArray<string>;
}

interface PageNodeBase {
	readonly name: string;
	readonly exists: boolean;
	readonly placed: boolean;
}

interface VisualEntry {
	readonly name: string;
	readonly path: string;
	readonly value: unknown;
	readonly isGroup: boolean;
	readonly content: Content<AnyVisual>;
	readonly placed: boolean;
}

const VISUAL_FILE = /^visuals\/[^/]+\/visual\.json$/u;

const readOwnSchema =
	<A>(
		schemas: Readonly<Record<string, string>>,
		label: string,
		read: (value: unknown, text?: string) => Content<A>,
	) =>
	(value: unknown, text?: string): Content<A> =>
		Object.values(schemas).some((schema) => schema === at(value, "$schema"))
			? read(value, text)
			: Result.fail(`Unknown ${label} $schema`);

const readVisual = readOwnSchema(SchemaUrl.visual, "visual", decoded(AnyVisual, "visual"));
const readPage = readOwnSchema(SchemaUrl.page, "page", decoded(AnyPageFile, "page"));
const readPagesMetadata = decoded(PagesMetadataItem, "pages metadata");
const readPageOrder = decodeUnknownOption(ArraySchema(String));

export const pagesFolder = (report: string): string => `${report}/definition/pages`;

export const pagesMetadataPath = (report: string): string => `${pagesFolder(report)}/pages.json`;

const titleOf = (visual: unknown): string | undefined => {
	const group = string(at(at(visual, "visualGroup"), "displayName"));
	if (group !== undefined) return group;
	const entries = at(at(at(visual, "visual"), "visualContainerObjects"), "title");
	const titles = list(entries).flatMap((entry) => {
		const text = textOf(at(at(at(entry, "properties"), "text"), "expr"));
		return text === undefined ? [] : [{ text, scoped: at(entry, "selector") !== undefined }];
	});
	return (titles.find((title) => !title.scoped) ?? titles[0])?.text;
};

const visualEntry = (files: ReportFiles, page: PageNodeBase, path: string): VisualEntry => {
	const value = files.json(path);
	const name = nameOf(value) ?? basename(parent(path));
	const misplaced =
		page.placed &&
		insideProject(name) &&
		path === `${pagesFolder(files.report)}/${page.name}/visuals/${name}/visual.json`
			? nameFailure(name)
			: "Visual or page folder differs from its name";
	return {
		name,
		path,
		value,
		placed: misplaced === undefined,
		isGroup: at(value, "visualGroup") !== undefined,
		content: page.exists
			? misplaced === undefined
				? fileContent(files, path, value, readVisual)
				: Result.fail(misplaced)
			: Result.fail("Page file is missing"),
	};
};

const visualNodes = (entries: ReadonlyArray<VisualEntry>): ReadonlyArray<VisualNode> => {
	const parentOf = (entry: VisualEntry): VisualEntry | undefined => {
		const parentName = string(at(entry.value, "parentGroupName"));
		const matches = entries.filter((candidate) => candidate.name === parentName);
		const [match] = matches;
		return matches.length === 1 && match !== undefined && match.isGroup && match !== entry
			? match
			: undefined;
	};
	const parents = new Map(entries.map((entry) => [entry, parentOf(entry)]));
	const listed = new Set<VisualEntry>();
	const nodeOf = (entry: VisualEntry): VisualNode => {
		listed.add(entry);
		return {
			kind: entry.isGroup ? "group" : "visual",
			name: entry.name,
			path: entry.path,
			placed: entry.placed,
			content: entry.content,
			visualType: string(at(at(entry.value, "visual"), "visualType")),
			title: titleOf(entry.value),
			hidden: at(entry.value, "isHidden") === true,
			children: entries
				.filter((child) => parents.get(child) === entry && !listed.has(child))
				.map((child) => nodeOf(child)),
		};
	};
	const roots = entries.filter((entry) => parents.get(entry) === undefined).map((entry) => nodeOf(entry));
	const cycles = entries.flatMap((entry) => (listed.has(entry) ? [] : [nodeOf(entry)]));
	return roots.concat(cycles);
};

const pageFolders = (files: ReportFiles): ReadonlyArray<PageFolder> => {
	const prefix = `${pagesFolder(files.report)}/`;
	const inFolder = files.paths.flatMap((path) => {
		if (!path.startsWith(prefix)) return [];
		const [folder = "", ...rest] = path.slice(prefix.length).split("/");
		const inner = rest.join("/");
		return inner === "page.json" || VISUAL_FILE.test(inner) ? [{ folder, path, inner }] : [];
	});
	return [...new Set(inFolder.map((entry) => entry.folder))].toSorted().map((folder) => {
		const path = `${prefix}${folder}/page.json`;
		const value = files.json(path);
		return {
			folder,
			path,
			value,
			name: nameOf(value) ?? folder,
			visuals: inFolder
				.filter((entry) => entry.folder === folder && entry.inner !== "page.json")
				.map((entry) => entry.path)
				.toSorted(),
		};
	});
};

const pageNode = (files: ReportFiles, folder: PageFolder): PageNode => {
	const { name, path, value } = folder;
	const exists = files.has(path);
	const misplaced = folder.folder === name ? nameFailure(name) : "Page folder differs from its name";
	const base = { name, exists, placed: exists && misplaced === undefined };
	const binding = string(at(at(value, "pageBinding"), "type"));
	return {
		name,
		path,
		placed: base.placed,
		displayName: string(at(value, "displayName")) ?? name,
		type: string(at(value, "type")) ?? (binding === "Default" ? undefined : binding),
		hidden: at(value, "visibility") === "HiddenInViewMode",
		content: exists
			? misplaced === undefined
				? fileContent(files, path, value, readPage)
				: Result.fail(misplaced)
			: Result.fail("Page file is missing"),
		visuals: visualNodes(folder.visuals.map((visual) => visualEntry(files, base, visual))),
	};
};

const missingFolder = (files: ReportFiles, name: string): PageFolder => ({
	folder: name,
	name,
	path: `${pagesFolder(files.report)}/${name}/page.json`,
	value: undefined,
	visuals: [],
});

const metadataContent = (files: ReportFiles, pages: ReadonlyArray<PageNode>): Content<PagesMetadataItem> => {
	const value = files.json(pagesMetadataPath(files.report));
	const order = readPageOrder(at(value, "pageOrder"));
	if (Option.isNone(order)) return Result.fail("Missing or invalid pageOrder");
	const placed = pages.filter((page) => page.placed).map((page) => page.name);
	if (!sameList(order.value, placed)) return Result.fail("pageOrder differs from the page folders");
	return readPagesMetadata(Predicate.isReadonlyObject(value) ? omit(value, ["pageOrder"]) : value);
};

export const pagesOf = (files: ReportFiles) => {
	const folders = pageFolders(files);
	const order = [...new Set(strings(at(files.json(pagesMetadataPath(files.report)), "pageOrder")))];
	const ordered = order.map(
		(name) => folders.find((folder) => folder.name === name) ?? missingFolder(files, name),
	);
	const rest = folders.filter((folder) => !ordered.includes(folder));
	const pages = [...ordered, ...rest].map((folder) => pageNode(files, folder));
	return {
		pages,
		pagesMetadata: { path: pagesMetadataPath(files.report), content: metadataContent(files, pages) },
	};
};
