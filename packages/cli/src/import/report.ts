import { Predicate } from "effect";

import { checkConfig } from "@pbirkit/core/check";
import { isRaw } from "@pbirkit/core/config";
import type { Config } from "@pbirkit/core/config";
import { at, queryRefOf } from "@pbirkit/core/expr";
import type { ReportTree } from "@pbirkit/core/tree";

import { Layout } from "../layout.ts";
import type { Fallback } from "./draft.ts";
import type { Located } from "./modules.ts";
import type { Ids } from "./names.ts";

const FINGERPRINT_SKIP = new Set(["$schema", "name", "position", "parentGroupName"]);
const NONE = "None.";

type Page = Config["report"]["pages"][number];
type Visual = Page["visuals"][number];
type BookmarkItem = NonNullable<Config["report"]["bookmarks"]>["items"][number];
type BookmarkEntry = Exclude<BookmarkItem, { readonly children: unknown }>;

interface ReportInput {
	readonly config: Config;
	readonly index: ReportTree;
	readonly fallbacks: ReadonlyArray<Fallback>;
	readonly ids: Ids;
	readonly located: Located;
}

interface Placed {
	readonly page: Page;
	readonly visual: Visual;
}

interface Drift {
	readonly pointer: string;
	readonly found: string;
	readonly derived: string;
}

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
	Predicate.isReadonlyObject(value) && !Array.isArray(value);

const walk = (value: unknown, visit: (node: Readonly<Record<string, unknown>>, pointer: string) => void) => {
	const step = (item: unknown, pointer: string) => {
		if (Array.isArray(item)) {
			for (const [position, entry] of item.entries()) step(entry, `${pointer}/${position}`);
			return;
		}
		if (!isObject(item)) return;

		visit(item, pointer);
		for (const [key, entry] of Object.entries(item)) step(entry, `${pointer}/${key}`);
	};

	step(value, "");
};

const clusters = <A>(
	items: ReadonlyArray<A>,
	key: (item: A) => string | undefined,
): ReadonlyArray<ReadonlyArray<A>> => {
	const keyed = items.flatMap((item) => {
		const found = key(item);
		return found === undefined ? [] : [{ item, found }];
	});
	const groups = [...Map.groupBy(keyed, ({ found }) => found).values()];

	return groups
		.filter((group) => group.length > 1)
		.map((group) => group.map(({ item }) => item))
		.toSorted((left, right) => right.length - left.length);
};

const visualTypeOf = (visual: Visual | undefined): string => String(at(at(visual, "visual"), "visualType"));

const fieldsOf = (visual: Visual | undefined): ReadonlyArray<string> => {
	const found = new Set<string>();

	walk(at(at(visual, "visual"), "query"), (node) => {
		const field = node["field"];
		const ref = field === undefined ? undefined : queryRefOf(field);
		if (ref !== undefined) found.add(ref);
	});

	return [...found].toSorted();
};

const filterStateOf = (bookmark: BookmarkEntry): string | undefined => {
	if (isRaw(bookmark)) return undefined;

	const states: Array<readonly [string, unknown]> = [];
	walk(bookmark.explorationState, (node, pointer) => {
		const filters = node["filters"];
		const used =
			isObject(filters) && Object.values(filters).some((entry) => !Array.isArray(entry) || entry.length > 0);
		if (used) states.push([`${pointer}/filters`, filters]);
	});

	return states.length === 0 ? undefined : JSON.stringify(states);
};

const queryRefDrift = (visual: Visual): ReadonlyArray<Drift> => {
	if (isRaw(visual)) return [];

	const drift: Array<Drift> = [];
	walk(at(visual, "visual"), (node, pointer) => {
		const found = node["queryRef"];
		const derived = node["field"] === undefined ? undefined : queryRefOf(node["field"]);
		if (typeof found === "string" && derived !== undefined && found !== derived)
			drift.push({ pointer: `/visual${pointer}`, found, derived });
	});

	return drift;
};

const rawCount = (items: ReadonlyArray<object>): number => items.filter((item) => isRaw(item)).length;

const bulleted = (lines: ReadonlyArray<string>): ReadonlyArray<string> =>
	lines.length === 0 ? [NONE] : lines.map((line) => `- ${line}`);

const section = (title: string, intro: string, lines: ReadonlyArray<string>): ReadonlyArray<string> => [
	title,
	"",
	...(intro === "" ? [] : [intro, ""]),
	...lines,
	"",
];

const groups = <A>(
	members: ReadonlyArray<ReadonlyArray<A>>,
	title: (group: ReadonlyArray<A>, position: number) => string,
	line: (item: A) => string,
): ReadonlyArray<string> =>
	members.length === 0
		? [NONE]
		: members.flatMap((group, position) => [
				...(position === 0 ? [] : [""]),
				`### ${title(group, position)}`,
				"",
				...group.map((item) => `- ${line(item)}`),
			]);

export const importReport = ({ config, index, fallbacks, ids, located }: ReportInput): string => {
	const displayNames = new Map(index.pages.map((page) => [page.name, page.displayName]));

	const idOf = (name: string) => {
		const path = ids.paths.get(name);
		return path === undefined ? `"${name}"` : `\`ids.${path.join(".")}\``;
	};
	const fileOf = (item: unknown) => {
		const file = located.get(item);
		return file === undefined ? "" : ` in \`${file}\``;
	};
	const pageLabel = (page: Page) => `page "${displayNames.get(page.name) ?? page.name}" (${idOf(page.name)})`;
	const visualLabel = ({ page, visual }: Placed) =>
		`${idOf(visual.name)} on ${pageLabel(page)}${fileOf(visual)}`;

	const { pages, bookmarks, resources } = config.report;
	const placed: ReadonlyArray<Placed> = pages.flatMap((page) =>
		page.visuals.map((visual) => ({ page, visual })),
	);
	const singles = placed.filter(({ visual }) => !isRaw(visual) && at(visual, "visual") !== undefined);
	const entries = (bookmarks?.items ?? []).flatMap((item): ReadonlyArray<BookmarkEntry> =>
		"children" in item ? item.children : [item],
	);

	const exact = ({ visual }: Placed) =>
		JSON.stringify(Object.entries(visual).filter(([key]) => !FINGERPRINT_SKIP.has(key)));
	const sameFields = ({ visual }: Placed) => {
		const fields = fieldsOf(visual);
		return fields.length === 0 ? undefined : JSON.stringify([visualTypeOf(visual), fields]);
	};

	const duplicates = clusters(singles, exact);
	const similar = clusters(singles, sameFields).filter(
		(group) => new Set(group.map((item) => exact(item))).size > 1,
	);
	const states = clusters(entries, (entry) => filterStateOf(entry));
	const saved = entries.flatMap((entry) => filterStateOf(entry) ?? []);
	const distinct = new Set(saved).size;

	const warnings = checkConfig(config).warnings.map((warning) => warning.replace(/^\[WARN\] check: /u, ""));
	const imageThemes = (resources ?? []).flatMap((resource) =>
		resource.kind === "customTheme" && resource.itemType === "Image" ? [resource.name] : [],
	);
	const drift = placed.flatMap((item) =>
		queryRefDrift(item.visual).map(
			({ pointer, found, derived }) =>
				`${visualLabel(item)} at \`${pointer}\`: stored "${found}", the field gives "${derived}"`,
		),
	);

	return [
		`# Import report for ${config.name}`,
		"",
		"`pbirkit import` wrote this file for agents. It lists the work that the import leaves to you. Nothing reads this file back, so you can delete it when you are done.",
		"",
		...section("## Summary", "", [
			`- Pages: ${pages.length}, ${rawCount(pages)} kept as raw files`,
			`- Visuals: ${placed.length}, ${rawCount(placed.map(({ visual }) => visual))} kept as raw files`,
			`- Bookmarks: ${entries.length}, ${rawCount(entries)} kept as raw files`,
			`- Readable ids in \`${Layout.ids}\`: ${ids.paths.size}`,
		]),
		...section(
			"## Files the import kept raw",
			"",
			bulleted(fallbacks.map(({ label, reason }) => `${label}: ${reason}`)),
		),
		...section(
			"## Duplicate visuals",
			"Each group lists visuals that match in everything except name, position and parent group. Each group is a candidate for one shared builder.",
			groups(
				duplicates,
				(group) => `${visualTypeOf(group[0]?.visual)}, ${group.length} visuals`,
				(item) => visualLabel(item),
			),
		),
		...section(
			"## Similar visuals",
			"Each group lists visuals of one type that use the same fields. They can still differ in field roles, filters, sorting or formatting. Each group is a candidate for a builder with options.",
			groups(
				similar,
				(group) => `${visualTypeOf(group[0]?.visual)} on ${fieldsOf(group[0]?.visual).join(", ")}`,
				(item) => visualLabel(item),
			),
		),
		...section(
			"## Bookmark filter states",
			`${saved.length} of ${entries.length} bookmarks save filter data, in ${distinct} distinct states. ${rawCount(entries)} bookmarks are raw files, so this list leaves them out. The saved data includes filters with no condition and filters that only suppress data. Each group lists bookmarks that save the same filter data, so one shared value can hold it.`,
			groups(
				states,
				(group, position) => `State ${position + 1}, ${group.length} bookmarks`,
				(entry) => `${idOf(entry.name)}${fileOf(entry)}`,
			),
		),
		"## Desktop leftovers",
		"",
		...section(
			"### Check warnings",
			"These include broken page, bookmark and resource links.",
			bulleted(warnings),
		),
		...section(
			"### Themes registered as Image",
			'Desktop sometimes registers a custom theme with the item type Image instead of CustomTheme. The import keeps it as `itemType: "Image"` to rebuild the same JSON.',
			bulleted(imageThemes),
		),
		...section(
			"### queryRef mismatches",
			"Each entry is a projection whose stored queryRef differs from the one its field gives. A field rename in Desktop is one cause. The import keeps the stored queryRef to rebuild the same JSON.",
			bulleted(drift),
		),
	].join("\n");
};
