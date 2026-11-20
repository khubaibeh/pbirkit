import type { Config } from "./config.ts";
import { textOf } from "./expr/literal.ts";
import { at } from "./expr/query.ts";

type Page = Config["report"]["pages"][number];
type Visual = Page["visuals"][number];
type BookmarkItem = NonNullable<Config["report"]["bookmarks"]>["items"][number];

export interface VisualNode {
	readonly kind: "visual" | "group";
	readonly name: string;
	readonly visualType?: string;
	readonly title?: string;
	readonly hidden?: true;
	readonly children?: ReadonlyArray<VisualNode>;
}

export interface PageNode {
	readonly name: string;
	readonly displayName: string;
	readonly type?: string;
	readonly hidden?: true;
	readonly visuals: ReadonlyArray<VisualNode>;
}

export interface BookmarkNode {
	readonly kind: "bookmark";
	readonly name: string;
	readonly displayName: string;
	readonly page: string;
	readonly switchesPage: boolean;
	readonly pageExists: boolean;
}

export interface BookmarkGroupNode {
	readonly kind: "group";
	readonly name: string;
	readonly displayName: string;
	readonly children: ReadonlyArray<BookmarkNode>;
}

export interface ReportTree {
	readonly name: string;
	readonly pages: ReadonlyArray<PageNode>;
	readonly bookmarks: ReadonlyArray<BookmarkNode | BookmarkGroupNode>;
}

const string = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const titleOf = (visual: Visual): string | undefined => {
	const group = string(at(at(visual, "visualGroup"), "displayName"));
	if (group !== undefined) return group;
	const entries = at(at(at(visual, "visual"), "visualContainerObjects"), "title");
	const titles = (Array.isArray(entries) ? entries : []).flatMap((entry) => {
		const text = textOf(at(at(at(entry, "properties"), "text"), "expr"));
		return text === undefined ? [] : [{ text, scoped: at(entry, "selector") !== undefined }];
	});
	return (titles.find((title) => !title.scoped) ?? titles[0])?.text;
};

const isGroup = (visual: Visual): boolean => "visualGroup" in visual && visual.visualGroup !== undefined;

const visualNodes = (visuals: ReadonlyArray<Visual>): ReadonlyArray<VisualNode> => {
	const parentOf = (visual: Visual): Visual | undefined => {
		const matches = visuals.filter((other) => other.name === visual.parentGroupName);
		const [parent] = matches;
		return matches.length === 1 && parent !== undefined && parent !== visual && isGroup(parent)
			? parent
			: undefined;
	};
	const parents = new Map(visuals.map((visual) => [visual, parentOf(visual)]));
	const listed = new Set<Visual>();
	const nodeOf = (visual: Visual): VisualNode => {
		listed.add(visual);
		const children: Array<VisualNode> = [];
		for (const child of visuals)
			if (parents.get(child) === visual && !listed.has(child)) children.push(nodeOf(child));
		const visualType = string(at(at(visual, "visual"), "visualType"));
		const title = titleOf(visual);
		return {
			kind: isGroup(visual) ? "group" : "visual",
			name: visual.name,
			...(visualType === undefined ? {} : { visualType }),
			...(title === undefined ? {} : { title }),
			...(at(visual, "isHidden") === true ? { hidden: true as const } : {}),
			...(isGroup(visual) ? { children } : {}),
		};
	};
	const roots: Array<VisualNode> = [];
	for (const visual of visuals) if (parents.get(visual) === undefined) roots.push(nodeOf(visual));
	for (const visual of visuals) if (!listed.has(visual)) roots.push(nodeOf(visual));
	return roots;
};

const pageTypeOf = (page: Page): string | undefined => {
	const binding = string(at(at(page, "pageBinding"), "type"));
	return string(at(page, "type")) ?? (binding === "Default" ? undefined : binding);
};

const pageNode = (page: Page): PageNode => {
	const type = pageTypeOf(page);
	return {
		name: page.name,
		displayName: page.displayName,
		...(type === undefined ? {} : { type }),
		...(page.visibility === "HiddenInViewMode" ? { hidden: true as const } : {}),
		visuals: visualNodes(page.visuals),
	};
};

type Bookmark = Exclude<BookmarkItem, { readonly children: unknown }>;

const bookmarkOf =
	(pages: ReadonlySet<string>) =>
	(bookmark: Bookmark): BookmarkNode => ({
		kind: "bookmark",
		name: bookmark.name,
		displayName: bookmark.displayName,
		page: bookmark.explorationState.activeSection,
		switchesPage: bookmark.options?.suppressActiveSection !== true,
		pageExists: pages.has(bookmark.explorationState.activeSection),
	});

const bookmarkNode =
	(pages: ReadonlySet<string>) =>
	(item: BookmarkItem): BookmarkNode | BookmarkGroupNode =>
		"children" in item
			? {
					kind: "group",
					name: item.name,
					displayName: item.displayName,
					children: item.children.map(bookmarkOf(pages)),
				}
			: bookmarkOf(pages)(item);

export const reportTree = (config: Config): ReportTree => ({
	name: config.name,
	pages: config.report.pages.map((page) => pageNode(page)),
	bookmarks: (config.report.bookmarks?.items ?? []).map(
		bookmarkNode(new Set(config.report.pages.map((page) => page.name))),
	),
});
