import { Array, Struct, URL as UrlSchema, Union } from "effect/Schema";

import { AnyBookmark } from "#schemas/bookmark";
import { RawItem } from "#schemas/common/raw.ts";

import {
	BookmarkGroupMetadata,
	BookmarksMetadata as BookmarksMetadataV1_0,
} from "./bookmarks-metadata/1.0.0.ts";

/** One bookmark: a full definition, or a `RawItem` that copies an existing `*.bookmark.json` file. */
export const BookmarkEntry = Union([AnyBookmark, RawItem]);

export type BookmarkEntry = typeof BookmarkEntry.Type;

/** A bookmark group in config input. It holds the bookmarks themselves, not their names. */
export const BookmarkGroup = BookmarkGroupMetadata.mapFields((fields) => ({
	...fields,
	children: Array(BookmarkEntry),
}));

export type BookmarkGroup = typeof BookmarkGroup.Type;

/** The `report.bookmarks` config input. The build writes `bookmarks.json` from `items`, and one file per bookmark. */
export const BookmarksItem = BookmarksMetadataV1_0.mapFields((fields) => ({
	...fields,
	items: Array(Union([AnyBookmark, RawItem, BookmarkGroup])),
}));

export type BookmarksItem = typeof BookmarksItem.Type;

/** Bookmarks with an existing `bookmarks.json` to copy from `file`, plus the bookmark files in `items`. */
export const RawBookmarks = Struct({ file: UrlSchema, items: Array(BookmarkEntry) });

export type RawBookmarks = typeof RawBookmarks.Type;
