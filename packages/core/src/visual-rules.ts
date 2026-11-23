import { at } from "./expr/query.ts";

const BUTTON_OBJECTS = ["text", "icon", "fill", "outline"];

const list = (value: unknown): ReadonlyArray<unknown> => (Array.isArray(value) ? value : []);

const hasKey = (value: unknown, key: string): boolean =>
	typeof value === "object" && value !== null && Object.hasOwn(value, key);

const isField = (value: unknown): boolean => {
	const expr = at(value, "expr");
	return typeof expr === "object" && expr !== null && !hasKey(expr, "Literal");
};

const hasTotalsWildcard = (selector: unknown): boolean =>
	list(at(selector, "data")).some((item) => at(at(item, "dataViewWildcard"), "matchingOption") === 0);

const cardIssues = (objects: unknown): ReadonlyArray<string> =>
	list(at(objects, "referenceLabel")).flatMap((entry, index) =>
		isField(at(at(entry, "properties"), "value")) && !hasTotalsWildcard(at(entry, "selector"))
			? [
					`objects.referenceLabel[${index}]: value is a field, but the selector has no dataViewWildcard with matchingOption 0, so Desktop shows the showBlankAs text. Add wildcard(field, 0) to the selector`,
				]
			: [],
	);

const buttonIssues = (objects: unknown): ReadonlyArray<string> =>
	BUTTON_OBJECTS.flatMap((name) => {
		const shows = list(at(objects, name)).filter((entry) => hasKey(at(entry, "properties"), "show"));
		return shows.length > 0 && shows.every((entry) => hasKey(entry, "selector"))
			? [
					`objects.${name}: show is set only in entries with a selector, and Desktop ignores it there. Set show in an entry with no selector`,
				]
			: [];
	});

export const visualRuleIssues = (visual: unknown): ReadonlyArray<string> => {
	const type = at(visual, "visualType");
	const objects = at(visual, "objects");
	if (type === "cardVisual") return cardIssues(objects);
	if (type === "actionButton") return buttonIssues(objects);
	return [];
};
