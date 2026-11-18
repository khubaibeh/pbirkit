import { Option } from "effect";

import type { Config } from "../config.ts";
import { toJson } from "./json.ts";

export type BuildFile =
	| { readonly path: string; readonly content: string }
	| { readonly path: string; readonly source: URL }
	| { readonly path: string; readonly sourceFolder: URL };

export const jsonFile = (path: string, value: unknown): BuildFile => ({ path, content: toJson(value) });

export const withoutDot = (path: string): string => path.replace(/^\.\//u, "").replace(/\/+$/u, "");

export const whenSet = <A, B>(
	value: A | undefined,
	items: (value: A) => ReadonlyArray<B>,
): ReadonlyArray<B> => Option.match(Option.fromNullishOr(value), { onNone: () => [], onSome: items });

export const platform = (
	type: "Report" | "SemanticModel",
	displayName: string,
	logicalId: string,
	item: Config["report"]["platform"],
) => {
	const { $schema, version, ...metadata } = item;
	return { $schema, metadata: { type, displayName, ...metadata }, config: { version, logicalId } };
};
