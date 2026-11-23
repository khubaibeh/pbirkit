import { expectTypeOf, it } from "vite-plus/test";

import { entry, measure, project, props, role } from "../expr/index.ts";
import { defineVisual } from "../schemas/visual/2.13.0.ts";
import { objectsFor, rolesFor } from "./index.ts";
import type { CheckedObjects, CheckedRoles } from "./types.ts";

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

it("checks names in objectsFor and rolesFor", () => {
	const known = { legend: [entry(props({ show: true }))] } as const;
	const object = { bogus: [entry(props({ show: true }))] } as const;
	const property = { legend: [entry(props({ nope: true }))] } as const;
	const roles = { Y: role(project(measure("Sales", "Net Sales"))) };
	const unknown = { Values: role(project(measure("Sales", "Net Sales"))) };

	type Objects<O> = CheckedObjects<"clusteredBarChart", O>;
	type Roles<S> = CheckedRoles<"clusteredBarChart", S>;

	expectTypeOf(known).toExtend<Objects<typeof known>>();
	expectTypeOf(object).not.toExtend<Objects<typeof object>>();
	expectTypeOf(property).not.toExtend<Objects<typeof property>>();
	expectTypeOf(roles).toExtend<Roles<typeof roles>>();
	expectTypeOf(unknown).not.toExtend<Roles<typeof unknown>>();
	expectTypeOf(objectsFor("clusteredBarChart")(known)).toExtend<typeof known>();
	expectTypeOf(rolesFor("clusteredBarChart")(roles)).toExtend<typeof roles>();
});
