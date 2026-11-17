import { Union } from "effect/Schema";

import { Bookmark as BookmarkV1_0 } from "./1.0.0.ts";
import { Bookmark as BookmarkV1_1 } from "./1.1.0.ts";
import { Bookmark as BookmarkV1_2 } from "./1.2.0.ts";
import { Bookmark as BookmarkV1_3 } from "./1.3.0.ts";
import { Bookmark as BookmarkV1_4 } from "./1.4.0.ts";
import { Bookmark as BookmarkV2_0 } from "./2.0.0.ts";
import { Bookmark as BookmarkV2_1 } from "./2.1.0.ts";

export const AnyBookmark = Union([
	BookmarkV1_0,
	BookmarkV1_1,
	BookmarkV1_2,
	BookmarkV1_3,
	BookmarkV1_4,
	BookmarkV2_0,
	BookmarkV2_1,
]);

export type AnyBookmark = typeof AnyBookmark.Type;
