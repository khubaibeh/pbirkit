import { expect, it } from "vite-plus/test";

import { measure, props, wildcard } from "./expr/index.ts";
import { visualRuleIssues } from "./visual-rules.ts";

const net = measure("Sales", "Net Sales");

it("warns about a referenceLabel field value without a totals wildcard", () => {
	expect(
		visualRuleIssues({
			visualType: "cardVisual",
			objects: {
				referenceLabel: [
					{ properties: props({ value: net }), selector: { id: "default", metadata: "Sales.Net Sales" } },
					{ properties: props({ value: net }), selector: { id: "default", ...wildcard(net) } },
					{ properties: props({ value: net }), selector: { id: "default", ...wildcard(net, 0) } },
					{ properties: props({ show: true }), selector: { id: "default" } },
				],
			},
		}),
	).toEqual([
		"objects.referenceLabel[0]: value is a field, but the selector has no dataViewWildcard with matchingOption 0, so Desktop shows the showBlankAs text. Add wildcard(field, 0) to the selector",
		"objects.referenceLabel[1]: value is a field, but the selector has no dataViewWildcard with matchingOption 0, so Desktop shows the showBlankAs text. Add wildcard(field, 0) to the selector",
	]);
});

it("warns about an actionButton show that only a state entry sets", () => {
	expect(
		visualRuleIssues({
			visualType: "actionButton",
			objects: {
				text: [{ properties: props({ show: true }), selector: { id: "default" } }],
				icon: [
					{ properties: props({ show: false }) },
					{ properties: props({ show: true }), selector: { id: "hover" } },
				],
				fill: [{ properties: props({ transparency: 0 }), selector: { id: "default" } }],
			},
		}),
	).toEqual([
		"objects.text: show is set only in entries with a selector, and Desktop ignores it there. Set show in an entry with no selector",
	]);
	expect(
		visualRuleIssues({
			visualType: "shape",
			objects: { text: [{ properties: props({ show: true }), selector: { id: "default" } }] },
		}),
	).toEqual([]);
});
