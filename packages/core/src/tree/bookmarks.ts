import { Option, Result } from "effect";

import { AnyBookmark } from "#schemas/bookmark";
import { BookmarkGroupMetadata, BookmarksMetadata } from "#schemas/bookmarks-metadata/1.0.0.ts";
import { SchemaUrl } from "#schemas/schema-url.ts";

import { insideProject } from "../build/shared.ts";
import { at } from "../expr/query.ts";
import { nameFailure } from "../name.ts";
import type { Content, IndexedFile, ReportFiles } from "./shared.ts";
import { basename, decoded, fileContent, list, nameOf, string, strings } from "./shared.ts";

export interface BookmarkNode extends IndexedFile<AnyBookmark> {
	readonly kind: "bookmark";
	readonly name: string;
	readonly placed: boolean;
	readonly displayName: string;
	readonly page?: string;
	readonly switchesPage: boolean;
	readonly pageExists: boolean;
}

export interface BookmarkGroupNode extends IndexedFile<BookmarkGroupMetadata> {
	readonly kind: "group";
	readonly name: string;
	readonly displayName: string;
	readonly children: ReadonlyArray<BookmarkNode>;
}

interface BookmarkFile {
	readonly path: string;
	readonly name: string;
	readonly value: unknown;
}

const SUFFIX = ".bookmark.json";

const readBookmark = decoded(AnyBookmark, "bookmark");
const readGroup = decoded(BookmarkGroupMetadata, "bookmark group");
const readMetadata = decoded(BookmarksMetadata, "bookmarks metadata");

export const bookmarksFolder = (report: string): string => `${report}/definition/bookmarks`;

const bookmarkContent = (files: ReportFiles, file: BookmarkFile): Content<AnyBookmark> =>
	Object.values(SchemaUrl.bookmark).some((schema) => schema === at(file.value, "$schema"))
		? fileContent(files, file.path, file.value, readBookmark)
		: Result.fail("Unknown bookmark $schema");

const bookmarkFiles = (files: ReportFiles): ReadonlyArray<BookmarkFile> => {
	const folder = `${bookmarksFolder(files.report)}/`;
	return files.paths
		.filter((path) => path.startsWith(folder) && path.endsWith(SUFFIX))
		.toSorted()
		.map((path) => {
			const value = files.json(path);
			return { path, value, name: nameOf(value) ?? basename(path).slice(0, -SUFFIX.length) };
		});
};

const bookmarkNode = (
	files: ReportFiles,
	pages: ReadonlySet<string>,
	name: string,
	file: BookmarkFile | undefined,
): BookmarkNode => {
	const expected = `${bookmarksFolder(files.report)}/${name}${SUFFIX}`;
	const page = string(at(at(file?.value, "explorationState"), "activeSection"));
	const misplaced =
		file?.path === expected && insideProject(name)
			? nameFailure(name)
			: "Bookmark file path differs from its name";
	const placed = misplaced === undefined;
	return {
		kind: "bookmark",
		name,
		path: file?.path ?? expected,
		placed,
		displayName: string(at(file?.value, "displayName")) ?? name,
		page,
		switchesPage: at(at(file?.value, "options"), "suppressActiveSection") !== true,
		pageExists: page !== undefined && pages.has(page),
		content:
			file === undefined
				? Result.fail("Bookmark is listed in bookmarks.json but its file is missing")
				: misplaced === undefined
					? bookmarkContent(files, file)
					: Result.fail(misplaced),
	};
};

const metadataContent = (
	metadata: unknown,
	entries: ReadonlyArray<BookmarkNode>,
	unlisted: number,
): Content<BookmarksMetadata> => {
	const names = entries.map((entry) => entry.name);
	if (unlisted > 0) return Result.fail("Some bookmark files are not listed in bookmarks.json");
	if (entries.some((entry) => !entry.placed))
		return Result.fail("Some listed bookmarks have no valid name or no file at the expected path");
	if (new Set(names).size !== names.length) return Result.fail("A bookmark is listed more than once");
	return readMetadata(metadata);
};

export const bookmarksOf = (files: ReportFiles, pages: ReadonlySet<string>) => {
	const path = `${bookmarksFolder(files.report)}/bookmarks.json`;
	const metadata = files.json(path);
	const found = bookmarkFiles(files);
	const node = (name: string) =>
		bookmarkNode(
			files,
			pages,
			name,
			found.find((file) => file.name === name),
		);
	const listed = list(at(metadata, "items")).flatMap(
		(item): ReadonlyArray<BookmarkNode | BookmarkGroupNode> => {
			const name = nameOf(item);
			if (name === undefined) return [];
			const children = at(item, "children");
			if (!Array.isArray(children)) return [node(name)];
			return [
				{
					kind: "group",
					name,
					path,
					displayName: string(at(item, "displayName")) ?? name,
					children: strings(children).map((child) => node(child)),
					content: Option.match(Option.fromNullishOr(nameFailure(name)), {
						onNone: () => readGroup(item),
						onSome: (failure) => Result.fail(failure),
					}),
				},
			];
		},
	);
	const entries = listed.flatMap((entry) => (entry.kind === "group" ? entry.children : [entry]));
	const unlisted = found
		.filter((file) => !entries.some((entry) => entry.path === file.path))
		.map((file) => bookmarkNode(files, pages, file.name, file));
	return {
		bookmarks: [...listed, ...unlisted],
		bookmarksMetadata: files.has(path)
			? { path, content: metadataContent(metadata, entries, unlisted.length) }
			: undefined,
	};
};
