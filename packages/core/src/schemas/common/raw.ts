import { String, Struct, URL as UrlSchema } from "effect/Schema";

export const RawItem = Struct({ name: String, file: UrlSchema });

export type RawItem = typeof RawItem.Type;

export const isRaw = <A extends object>(item: A): item is Extract<A, { readonly file: URL }> =>
	"file" in item && item.file instanceof URL;
