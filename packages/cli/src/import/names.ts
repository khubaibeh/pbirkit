import { Array as Arr, Option, Predicate } from "effect";

import { at, queryRefOf } from "@pbirkit/core/expr";
import { flattenVisuals } from "@pbirkit/core/tree";
import type { ReportTree } from "@pbirkit/core/tree";

import { Layout } from "../layout.ts";

const GENERATED = /^(?:(?:ReportSection|Bookmark)[0-9a-f]*|[0-9a-f]{20})$/u;
const COLOR = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/u;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
const CUSTOM_VISUAL_GUID = /[0-9A-F]{32}$/u;
const MAX_NAME = 64;
const RESERVED_FILES = [
	"con",
	"prn",
	"aux",
	"nul",
	...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`com${n}`, `lpt${n}`]),
];

type Path = ReadonlyArray<string>;
type Words = ReadonlyArray<string>;

export interface ItemName {
	readonly file: string;
	readonly key: string;
}

export interface Names {
	readonly pages: ReadonlyMap<string, ItemName>;
	readonly visuals: ReadonlyMap<string, ReadonlyMap<string, ItemName>>;
	readonly bookmarks: ReadonlyMap<string, ItemName>;
}

export interface Ids {
	readonly value: Readonly<Record<string, unknown>>;
	readonly paths: ReadonlyMap<string, Path>;
}

export const wordsOf = (text: string | undefined): Words =>
	(text ?? "")
		.normalize("NFKD")
		.replaceAll(/[\u0300-\u036F]/gu, "")
		.replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
		.split(/[^A-Za-z0-9]+/u)
		.filter((word) => word !== "");

export const fileOf = (words: Words): string => words.map((word) => word.toLowerCase()).join("-");

export const keyOf = (words: Words): string => {
	const [first = "", ...rest] = words;
	const head = first.toLowerCase();
	const tail = rest.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`);
	const key = [head, ...tail].join("");

	return /^\d/u.test(key) ? `_${key}` : key;
};

const bounded = (words: Words): Words => {
	const kept: Array<string> = [];

	for (const word of words) {
		if ([...kept, word].join("-").length > MAX_NAME)
			return kept.length === 0 ? [word.slice(0, MAX_NAME)] : kept;
		kept.push(word);
	}

	return kept;
};

export const nameScope = (reserved: ReadonlyArray<string> = []) => {
	const files = new Set([...RESERVED_FILES, ...reserved]);
	const keys = new Set<string>();
	const take = (parts: Words): ItemName | undefined => {
		const name = { file: fileOf(parts), key: keyOf(parts) };
		if (files.has(name.file) || keys.has(name.key)) return undefined;

		files.add(name.file);
		keys.add(name.key);
		return name;
	};

	return (words: Words, numbered = false): ItemName => {
		const base = bounded(words);
		const plain = numbered ? undefined : take(base);
		if (plain !== undefined) return plain;

		for (let suffix = numbered ? 1 : 2; ; suffix += 1) {
			const name = take([...base, `${suffix}`]);
			if (name !== undefined) return name;
		}
	};
};

const firstNonEmpty = (candidates: ReadonlyArray<Words>): Words =>
	candidates.find((words) => words.length > 0) ?? [];

export const typeWords = (visualType: string | undefined): Words =>
	wordsOf(visualType?.replace(CUSTOM_VISUAL_GUID, "").replace(/Ex$/u, ""));

const firstFieldOf = (visual: unknown): string | undefined => {
	const roles = at(at(at(visual, "visual"), "query"), "queryState");
	const projections = Predicate.isReadonlyObject(roles)
		? Object.values(roles).flatMap((role) => {
				const items = at(role, "projections");
				return Arr.isArray(items) ? items : [];
			})
		: [];
	const [first] = projections;
	const native = at(first, "nativeQueryRef");

	return typeof native === "string" ? native : queryRefOf(at(first, "field"));
};

export const namesOf = (index: ReportTree, json: (path: string) => unknown): Names => {
	const named = (scope: ReturnType<typeof nameScope>, candidates: ReadonlyArray<Words>, type: Words) => {
		const words = firstNonEmpty(candidates);
		return words.length > 0 ? scope(words) : scope(type.length > 0 ? type : ["item"], true);
	};

	const pageScope = nameScope([Layout.indexName]);
	const pages = new Map<string, ItemName>();
	const visuals = new Map<string, ReadonlyMap<string, ItemName>>();

	for (const page of index.pages) {
		if (pages.has(page.name)) continue;
		pages.set(page.name, named(pageScope, [wordsOf(page.displayName), wordsOf(page.name)], ["page"]));

		const visualScope = nameScope();
		const own = new Map<string, ItemName>();
		for (const visual of flattenVisuals(page.visuals)) {
			if (own.has(visual.name)) continue;

			const type = visual.kind === "group" ? ["group"] : typeWords(visual.visualType);
			const field = wordsOf(firstFieldOf(json(visual.path)));
			const fromField = field.length > 0 ? [...field, ...type] : [];
			own.set(
				visual.name,
				named(visualScope, [wordsOf(visual.title), fromField, wordsOf(visual.name)], type),
			);
		}
		visuals.set(page.name, own);
	}

	const bookmarkScope = nameScope([Layout.indexName]);
	const bookmarks = new Map<string, ItemName>();
	const nodes = index.bookmarks.flatMap((item) =>
		item.kind === "group" ? [item, ...item.children] : [item],
	);

	for (const node of nodes) {
		if (bookmarks.has(node.name)) continue;
		bookmarks.set(
			node.name,
			named(bookmarkScope, [wordsOf(node.displayName), wordsOf(node.name)], [node.kind]),
		);
	}

	return { pages, visuals, bookmarks };
};

export const isGeneratedId = (name: string): boolean => GENERATED.test(name);

const idCounts = (index: ReportTree): ReadonlyMap<string, number> => {
	const names = [
		...index.pages.flatMap((page) => [
			page.name,
			...flattenVisuals(page.visuals).map((visual) => visual.name),
		]),
		...index.bookmarks.flatMap((item) =>
			item.kind === "group" ? [item.name, ...item.children.map((child) => child.name)] : [item.name],
		),
	];
	const counts = new Map<string, number>();
	for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);

	return counts;
};

export const idsOf = (index: ReportTree, names: Names): Ids => {
	const counts = idCounts(index);
	const paths = new Map<string, Path>();
	const add = (target: Record<string, string>, path: Path, id: string) => {
		const key = path.at(-1);
		if (key === undefined || !isGeneratedId(id) || counts.get(id) !== 1) return;

		target[key] = id;
		paths.set(id, path);
	};

	const pages: Record<string, string> = {};
	const visuals: Record<string, Record<string, string>> = {};

	for (const [page, name] of names.pages) {
		add(pages, ["pages", name.key], page);

		const own: Record<string, string> = {};
		for (const [visual, item] of names.visuals.get(page) ?? [])
			add(own, ["visuals", name.key, item.key], visual);

		if (Object.keys(own).length > 0) visuals[name.key] = own;
	}

	const bookmarks: Record<string, string> = {};
	for (const [bookmark, name] of names.bookmarks) add(bookmarks, ["bookmarks", name.key], bookmark);

	const sections = Object.entries({ pages, visuals, bookmarks });

	return {
		value: Object.fromEntries(sections.filter(([, entries]) => Object.keys(entries).length > 0)),
		paths,
	};
};

export const isColor = (value: unknown): value is string => Predicate.isString(value) && COLOR.test(value);

export const colorRoles = (themes: ReadonlyArray<unknown>): ReadonlyMap<string, string> => {
	const roles = new Map<string, string>();
	const names = new Set<string>();
	const add = (color: unknown, name: string) => {
		if (!isColor(color) || roles.has(color) || names.has(name)) return;

		roles.set(color, name);
		names.add(name);
	};

	for (const theme of themes) {
		if (!Predicate.isReadonlyObject(theme) || Array.isArray(theme)) continue;

		for (const [key, value] of Object.entries(theme)) {
			if (key === "dataColors" && Array.isArray(value))
				for (const [position, color] of value.entries()) add(color, `data${position + 1}`);
			else if (IDENTIFIER.test(key)) add(value, key);
		}
	}

	return roles;
};

export const colorName = (roles: ReadonlyMap<string, string>, color: string): string =>
	Option.getOrElse(Option.fromUndefinedOr(roles.get(color)), () => `hex${color.slice(1)}`);
