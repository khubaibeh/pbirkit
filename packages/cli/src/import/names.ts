import { Option, Predicate } from "effect";

import { flattenVisuals } from "@pbirkit/core/tree";
import type { ReportTree } from "@pbirkit/core/tree";

export const IDS_FILE = "ids.ts";
export const PALETTE_FILE = "palette.ts";

const GENERATED = /^(?:(?:ReportSection|Bookmark)[0-9a-f]*|[0-9a-f]{20})$/u;
const COLOR = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/u;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

type Path = ReadonlyArray<string>;

export interface Ids {
	readonly value: Readonly<Record<string, unknown>>;
	readonly paths: ReadonlyMap<string, Path>;
}

export const keyOf = (text: string | undefined, fallback: string): string => {
	const [first, ...rest] = (text ?? "").split(/[^A-Za-z0-9]+/u).filter((word) => word !== "");
	if (first === undefined) return fallback;

	const head =
		first === first.toUpperCase() ? first.toLowerCase() : `${first.charAt(0).toLowerCase()}${first.slice(1)}`;
	const tail = rest.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`);
	const key = [head, ...tail].join("");

	return /^\d/u.test(key) ? `_${key}` : key;
};

const uniqueKeys = () => {
	const used = new Set<string>();

	return (base: string): string => {
		let key = base;
		for (let suffix = 2; used.has(key); suffix += 1) key = `${base}_${suffix}`;

		used.add(key);
		return key;
	};
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

export const idsOf = (index: ReportTree): Ids => {
	const counts = idCounts(index);
	const paths = new Map<string, Path>();
	const add = (target: Record<string, string>, path: Path, key: string, id: string) => {
		if (!isGeneratedId(id) || counts.get(id) !== 1) return;

		target[key] = id;
		paths.set(id, path);
	};

	const pages: Record<string, string> = {};
	const visuals: Record<string, Record<string, string>> = {};
	const pageKey = uniqueKeys();

	for (const page of index.pages) {
		const key = pageKey(keyOf(page.displayName, "page"));
		add(pages, ["pages", key], key, page.name);

		const own: Record<string, string> = {};
		const visualKey = uniqueKeys();
		for (const visual of flattenVisuals(page.visuals)) {
			const name = visualKey(keyOf(visual.title ?? visual.visualType, visual.kind));
			add(own, ["visuals", key, name], name, visual.name);
		}

		if (Object.keys(own).length > 0) visuals[key] = own;
	}

	const bookmarks: Record<string, string> = {};
	const bookmarkKey = uniqueKeys();
	const nodes = index.bookmarks.flatMap((item) =>
		item.kind === "group" ? [item, ...item.children] : [item],
	);

	for (const node of nodes) {
		const key = bookmarkKey(keyOf(node.displayName, node.kind));
		add(bookmarks, ["bookmarks", key], key, node.name);
	}

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
