import { Array, Struct, URL as UrlSchema, Union } from "effect/Schema";

import { AnyBookmark } from "#schemas/bookmark";
import { RawItem } from "#schemas/common/raw.ts";

import {
	BookmarkGroupMetadata,
	BookmarksMetadata as BookmarksMetadataV1_0,
} from "./bookmarks-metadata/1.0.0.ts";

export const BookmarkEntry = Union([AnyBookmark, RawItem]);

export type BookmarkEntry = typeof BookmarkEntry.Type;

export const BookmarkGroup = BookmarkGroupMetadata.mapFields((fields) => ({
	...fields,
	children: Array(BookmarkEntry),
}));

export type BookmarkGroup = typeof BookmarkGroup.Type;

export const BookmarksItem = BookmarksMetadataV1_0.mapFields((fields) => ({
	...fields,
	items: Array(Union([AnyBookmark, RawItem, BookmarkGroup])),
}));

export type BookmarksItem = typeof BookmarksItem.Type;

export const RawBookmarks = Struct({ file: UrlSchema, items: Array(BookmarkEntry) });

export type RawBookmarks = typeof RawBookmarks.Type;
