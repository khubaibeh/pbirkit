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

export const decoded = <S extends Top & { readonly DecodingServices: never }>(schema: S, label: string) => {
	const read = decodeUnknownOption(schema);
	const matches = is(schema);

	return (value: unknown, text?: string): Content<S["Type"]> => {
		if (Option.isNone(read(value, { onExcessProperty: "error" })) || !matches(value))
			return Result.fail(`Unsupported ${label} schema or properties`);
		if (text !== undefined && toJson(value) !== text)
			return Result.fail(`The ${label} JSON does not rebuild to the same text`);
		return Result.succeed(value);
	};
};
