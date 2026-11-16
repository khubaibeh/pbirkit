import type { Config } from "./config.ts";

const NAME = /^[\p{L}\p{Mn}\p{Nd}\p{Pc}-]+$/u;
const MAX_NAME = 50;

type Page = Config["pages"][number];
type Visual = Page["visuals"][number];

const nameIssue = (where: string, name: string): ReadonlyArray<string> => [
	...(NAME.test(name) ? [] : [`${where}: name "${name}" must use only letters, digits, "_" or "-"`]),
	...(name.length > MAX_NAME ? [`${where}: name "${name}" is longer than ${MAX_NAME} characters`] : []),
];

const duplicates = (names: ReadonlyArray<string>): ReadonlyArray<string> => [
	...new Set(names.filter((name, index) => names.indexOf(name) !== index)),
];

const inGroupCycle = (start: Visual, byName: ReadonlyMap<string, Visual>): boolean => {
	const seen = new Set<string>();
	let current = start.parentGroupName === undefined ? undefined : byName.get(start.parentGroupName);
	while (current !== undefined && !seen.has(current.name)) {
		if (current.name === start.name) return true;
		seen.add(current.name);
		current = current.parentGroupName === undefined ? undefined : byName.get(current.parentGroupName);
	}
	return false;
};

const checkPage = (page: Page): ReadonlyArray<string> => {
	const where = `page "${page.name}"`;
	const byName = new Map(page.visuals.map((visual) => [visual.name, visual]));
	const issues: Array<string> = [...nameIssue(where, page.name)];
	for (const name of duplicates(page.visuals.map((visual) => visual.name)))
		issues.push(`${where}: visual name "${name}" is used more than once`);
	for (const visual of page.visuals) {
		const at = `${where} visual "${visual.name}"`;
		issues.push(...nameIssue(at, visual.name));
		if (visual.parentGroupName === undefined) continue;
		const parent = byName.get(visual.parentGroupName);
		if (parent === undefined)
			issues.push(`${at}: parentGroupName "${visual.parentGroupName}" is not a visual on this page`);
		else if (!("visualGroup" in parent))
			issues.push(`${at}: parentGroupName "${visual.parentGroupName}" is not a group`);
		else if (inGroupCycle(visual, byName)) issues.push(`${at}: parent groups form a cycle`);
	}
	for (const [index, interaction] of (page.visualInteractions ?? []).entries())
		for (const end of ["source", "target"] as const)
			if (!byName.has(interaction[end]))
				issues.push(
					`${where} visualInteractions[${index}]: ${end} "${interaction[end]}" is not a visual on this page`,
				);
	return issues;
};

export const checkConfig = (config: Config): ReadonlyArray<string> => {
	const pageNames = config.pages.map((page) => page.name);
	const bindings = config.pages.flatMap((page) =>
		"pageBinding" in page && page.pageBinding !== undefined ? [page.pageBinding.name] : [],
	);
	const active = config.report.pagesMetadata.activePageName;
	return [
		...duplicates(pageNames).map((name) => `report: page name "${name}" is used more than once`),
		...duplicates(bindings).map((name) => `report: pageBinding name "${name}" is used more than once`),
		...(active === undefined || pageNames.includes(active)
			? []
			: [`report: activePageName "${active}" is not a page in this report`]),
		...config.pages.flatMap(checkPage),
	].map((issue) => `[ERROR] check: ${issue}`);
};
