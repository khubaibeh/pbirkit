import { Array, String, optionalKey } from "effect/Schema";

/**
 * The fields of `pages.json` that all versions share.
 *
 * - `pageOrder`: The page names in display order. Desktop sorts pages missing from the list by display name
 *   and puts them last. It skips names with no page.
 * - `activePageName`: The page that the report opens on. It defaults to the first page in `pageOrder`.
 */
export const PagesMetadataFields = {
	pageOrder: optionalKey(Array(String)),
	activePageName: optionalKey(String),
};
