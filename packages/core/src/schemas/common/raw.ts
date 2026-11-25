import { String, Struct, URL as UrlSchema } from "effect/Schema";

/**
 * An item that the build copies from an existing file, not one that it writes from fields.
 *
 * - `name`: The item name. It sets the folder or file name in the output.
 * - `file`: A `file:` URL to the JSON file to copy, such as `new URL("./visual.json", import.meta.url)`.
 */
export const RawItem = Struct({ name: String, file: UrlSchema });

export type RawItem = typeof RawItem.Type;

/** True when the item is a `RawItem`, that is, it has a `file` URL. */
export const isRaw = <A extends object>(item: A): item is Extract<A, { readonly file: URL }> =>
	"file" in item && item.file instanceof URL;
