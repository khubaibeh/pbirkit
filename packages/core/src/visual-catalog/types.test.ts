import { expectTypeOf, it } from "vite-plus/test";

import { entry, measure, project, props, role } from "../expr/index.ts";
import { defineVisual } from "../schemas/visual/2.13.0.ts";

type Empty = Record<string, never>;

type Card<O, S = Empty> = Parameters<typeof defineVisual<"cardVisual", O, S>>[0];

const position = { x: 0, y: 0, width: 10, height: 10 };

it("rejects names that the catalog does not list in defineVisual", () => {
	const known = { layout: [entry(props({ orientation: 2 }), { id: "default" })] };
	const object = { bogus: [entry(props({ show: true }))] };
	const property = {
		layout: [entry(props({ orientation: 0 })), entry(props({ orientation: 0, nope: 1 }))] as const,
	};
	const roles = { Values: role(project(measure("Sales", "Net Sales"))) };

	expectTypeOf({
		name: "a",
		position,
		visual: { visualType: "cardVisual" as const, objects: known },
	}).toExtend<Card<typeof known>>();
	expectTypeOf({
		name: "b",
		position,
		visual: { visualType: "cardVisual" as const, objects: object },
	}).not.toExtend<Card<typeof object>>();
	expectTypeOf({
		name: "c",
		position,
		visual: { visualType: "cardVisual" as const, objects: property },
	}).not.toExtend<Card<typeof property>>();
	expectTypeOf({
		name: "d",
		position,
		visual: { visualType: "cardVisual" as const, query: { queryState: roles } },
	}).not.toExtend<Card<Empty, typeof roles>>();
});
