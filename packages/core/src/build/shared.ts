import { Option } from "effect";

import type { PlatformItem } from "#schemas/platform";

import { toJson } from "./json.ts";

export type BuildFile =
	| { readonly path: string; readonly content: string }
	| { readonly path: string; readonly text: string }
	| { readonly path: string; readonly source: URL }
	| { readonly path: string; readonly sourceFolder: URL };

export const jsonFile = (path: string, value: unknown): BuildFile => ({ path, content: toJson(value) });

export const jsonOrSource = (path: string, value: unknown): BuildFile =>
	value instanceof URL ? { path, source: value } : jsonFile(path, value);

export const withoutDot = (path: string): string => path.replace(/^\.\//u, "").replace(/\/+$/u, "");

export const insideProject = (path: string): boolean =>
	withoutDot(path)
		.split("/")
		.every((part) => part !== "" && part !== "." && part !== ".." && !/[\\:]/u.test(part));

export const rawFiles = (
	folder: string,
	files: { readonly [path: string]: URL | string },
): ReadonlyArray<BuildFile> =>
	Object.entries(files).map(([path, value]) => {
		const target = `${folder}/${withoutDot(path)}`;

		if (typeof value === "string") return { path: target, text: value };
		return path.endsWith("/") ? { path: target, sourceFolder: value } : { path: target, source: value };
	});

export const whenSet = <A, B>(
	value: A | undefined,
	items: (value: A) => ReadonlyArray<B>,
): ReadonlyArray<B> => Option.match(Option.fromNullishOr(value), { onNone: () => [], onSome: items });

export const platform = (
	type: "Report" | "SemanticModel",
	displayName: string | undefined,
	logicalId: string | undefined,
	item: PlatformItem,
) => {
	const { $schema, version, ...metadata } = item;

	return { $schema, metadata: { type, displayName, ...metadata }, config: { version, logicalId } };
};
