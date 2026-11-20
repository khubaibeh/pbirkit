import { Option, Result } from "effect";
import { decodeUnknownOption, is } from "effect/Schema";
import type { Top } from "effect/Schema";

import { toJson } from "../build/json.ts";
import { at } from "../expr/query.ts";

export type Content<A> = Result.Result<A, string>;

export interface IndexedFile<A> {
	readonly path: string;
	readonly content: Content<A>;
}

export interface ReportFiles {
	readonly report: string;
	readonly paths: ReadonlyArray<string>;
	readonly has: (path: string) => boolean;
	readonly json: (path: string) => unknown;
	readonly text: (path: string) => string | undefined;
	readonly raw: (path: string) => boolean;
}

export const string = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

export const list = (value: unknown): ReadonlyArray<unknown> => (Array.isArray(value) ? value : []);

export const strings = (value: unknown): ReadonlyArray<string> =>
	list(value).filter((item): item is string => typeof item === "string");

export const basename = (path: string): string => path.slice(path.lastIndexOf("/") + 1);

export const parent = (path: string): string => path.slice(0, path.lastIndexOf("/"));

export const sameList = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
	left.length === right.length && left.every((name, index) => name === right[index]);

export const nameOf = (value: unknown): string | undefined => string(at(value, "name"));

const desktopText = (text: string): string => text.replace(/^\uFEFF/u, "").replaceAll(/\r?\n/gu, "\r\n");

export const decoded = <S extends Top & { readonly DecodingServices: never }>(schema: S, label: string) => {
	const read = decodeUnknownOption(schema);
	const matches = is(schema);

	return (value: unknown, text?: string): Content<S["Type"]> => {
		if (Option.isNone(read(value, { onExcessProperty: "error" })) || !matches(value))
			return Result.fail(`Unsupported ${label} schema or properties`);
		if (text !== undefined && toJson(value) !== desktopText(text))
			return Result.fail(`The ${label} JSON does not rebuild to the same text`);
		return Result.succeed(value);
	};
};

const RAW_IN_CONFIG = "The config keeps this file raw";

export const fileContent = <A>(
	files: ReportFiles,
	path: string,
	value: unknown,
	read: (value: unknown, text?: string) => Content<A>,
): Content<A> => (files.raw(path) ? Result.fail(RAW_IN_CONFIG) : read(value, files.text(path)));
