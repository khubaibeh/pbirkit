import { Array, Literal, String, Struct, Union } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

export const SingleBookmarkMetadata = Struct({
	name: String,
});

export type SingleBookmarkMetadata = typeof SingleBookmarkMetadata.Type;

export const BookmarkGroupMetadata = Struct({
	name: String,
	displayName: String,
	children: Array(String),
});

export type BookmarkGroupMetadata = typeof BookmarkGroupMetadata.Type;

export const BookmarksMetadata = Struct({
	$schema: Literal(SchemaUrl.bookmarksMetadata["1.0.0"]),
	items: Array(Union([SingleBookmarkMetadata, BookmarkGroupMetadata])),
});

export type BookmarksMetadata = typeof BookmarksMetadata.Type;
