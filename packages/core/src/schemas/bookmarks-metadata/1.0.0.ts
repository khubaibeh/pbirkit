import { Array, Literal, String, Struct, Union } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

/**
 * A bookmark outside any group.
 *
 * - `name`: The bookmark `name`. It must be unique in the report.
 */
export const SingleBookmarkMetadata = Struct({
	name: String,
});

export type SingleBookmarkMetadata = typeof SingleBookmarkMetadata.Type;

/**
 * A named group of bookmarks.
 *
 * - `name`: The group name. It must be unique in the report.
 * - `displayName`: The group name that the bookmarks pane shows.
 * - `children`: The names of the bookmarks in the group, in order.
 */
export const BookmarkGroupMetadata = Struct({
	name: String,
	displayName: String,
	children: Array(String),
});

export type BookmarkGroupMetadata = typeof BookmarkGroupMetadata.Type;

/** The `bookmarks/bookmarks.json` file. It lists the bookmarks and groups in pane order. */
export const BookmarksMetadata = Struct({
	$schema: Literal(SchemaUrl.bookmarksMetadata["1.0.0"]),
	items: Array(Union([SingleBookmarkMetadata, BookmarkGroupMetadata])),
});

export type BookmarksMetadata = typeof BookmarksMetadata.Type;
