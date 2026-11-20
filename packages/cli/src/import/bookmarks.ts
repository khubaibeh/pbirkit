import { isDeepStrictEqual } from "node:util";

import { SchemaUrl } from "@pbirkit/core/schema-url";

import type { ImportOutput } from "./output.ts";
import { isName, jsonObject, object, strings } from "./source.ts";
import type { ArtifactFiles, JsonObject } from "./source.ts";

const FOLDER = "definition/bookmarks";
const METADATA = `${FOLDER}/bookmarks.json`;

type Bookmark = { readonly name: string; readonly path: string; readonly data: JsonObject };
type BookmarkGroup = {
	readonly name: string;
	readonly displayName: string;
	readonly children: ReadonlyArray<Bookmark>;
};

const bookmark = (files: ArtifactFiles, name: string): Bookmark | undefined => {
	const path = `${FOLDER}/${name}.bookmark.json`;
	const data = jsonObject(files.get(path));

	return data?.name === name && Object.values(SchemaUrl.bookmark).some((schema) => schema === data.$schema)
		? { name, path, data }
		: undefined;
};

const bookmarkItems = (
	files: ArtifactFiles,
	items: unknown,
): ReadonlyArray<Bookmark | BookmarkGroup> | undefined => {
	if (!Array.isArray(items)) return undefined;
	const entries: Array<Bookmark | BookmarkGroup> = [];

	for (const value of items) {
		const item = object(value);
		const name = item?.name;
		if (!isName(name)) return undefined;
		if (isDeepStrictEqual(item, { name })) {
			const found = bookmark(files, name);
			if (found === undefined) return undefined;
			entries.push(found);
		} else {
			const children = strings(item?.children);
			const displayName = item?.displayName;
			if (
				typeof displayName !== "string" ||
				children === undefined ||
				!isDeepStrictEqual(item, { name, displayName, children })
			) {
				return undefined;
			}
			const found: Array<Bookmark> = [];
			for (const child of children) {
				const entry = isName(child) ? bookmark(files, child) : undefined;
				if (entry === undefined) return undefined;
				found.push(entry);
			}
			entries.push({ name, displayName, children: found });
		}
	}

	return entries;
};

export const importBookmarks = (
	files: ArtifactFiles,
	claimed: Set<string>,
	output: ImportOutput,
): JsonObject | undefined => {
	if (!files.has(METADATA)) return undefined;
	const data = jsonObject(files.get(METADATA));
	const entries = bookmarkItems(files, data?.items);

	if (entries === undefined || data?.$schema !== SchemaUrl.bookmarksMetadata["1.0.0"]) {
		output.fallback(
			"Bookmarks",
			"Copied bookmark files because the metadata could not be mapped to bookmark entries",
		);
		return undefined;
	}

	claimed.add(METADATA);
	const module = ({ name, path, data: contents }: Bookmark) => {
		claimed.add(path);
		return output.module(`bookmarks/${name}.ts`, contents);
	};

	return {
		...data,
		items: entries.map((entry) =>
			"children" in entry
				? { name: entry.name, displayName: entry.displayName, children: entry.children.map(module) }
				: module(entry),
		),
	};
};
