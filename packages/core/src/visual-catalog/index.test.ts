import { expect, it } from "vite-plus/test";

import { measure, project, props, role } from "../expr/index.ts";
import { catalogNames, visualCatalogIssues } from "./index.ts";
import objects from "./objects.json" with { type: "json" };

const net = measure("Sales", "Net Sales");

it("keeps objects.json in step with the catalog package", () => {
	expect(JSON.stringify(objects)).toBe(JSON.stringify(catalogNames()));
});

it("names what the catalog does not list", () => {
	expect(
		visualCatalogIssues({
			visualType: "cardVisual",
			query: { queryState: { Values: role(project(net)) } },
			objects: {
				bogus: [{ properties: {} }],
				constructor: [{ properties: {} }],
				layout: [
					{ properties: props({ orientation: 9, nope: 1 }) },
					{ properties: {}, selector: { id: "hover" } },
				],
			},
		}),
	).toEqual([
		'query role "Values" is not a cardVisual role, which takes "Data", "Rows", "Tooltips", "TrendVisualCategory"',
		"objects.bogus is not a cardVisual object",
		"objects.constructor is not a cardVisual object",
		"objects.layout[0]: layout.orientation is 9, which is not one of 2, 1, 0",
		'objects.layout[0]: "nope" is not a property of layout',
		'objects.layout[1]: selector id "hover" is not a state of layout, which takes "default"',
	]);
	expect(
		visualCatalogIssues({
			visualType: "pieChart",
			query: { queryState: { Series: role(project(net)), Y: role(project(net), project(net)) } },
		}),
	).toEqual([
		'query roles "Series" (1 field), "Y" (2 fields) do not fit together in any pieChart data mapping',
	]);
	expect(
		visualCatalogIssues({
			visualType: "scatterChart",
			query: { queryState: { Gradient: role(project(net)) } },
		}),
	).toEqual([]);
});
