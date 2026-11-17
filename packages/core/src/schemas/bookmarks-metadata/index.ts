import { Array, Union } from "effect/Schema";

import { AnyBookmark } from "#schemas/bookmark";

import { BookmarkGroupMetadata, BookmarksMetadata as BookmarksMetadataV1_0 } from "./1.0.0.ts";

export const BookmarkGroup = BookmarkGroupMetadata.mapFields((fields) => ({
	...fields,
	children: Array(AnyBookmark),
}));

export type BookmarkGroup = typeof BookmarkGroup.Type;

export const BookmarksItem = BookmarksMetadataV1_0.mapFields((fields) => ({
	...fields,
	items: Array(Union([AnyBookmark, BookmarkGroup])),
}));

export type BookmarksItem = typeof BookmarksItem.Type;
