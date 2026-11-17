import { decodeUnknownSync } from "effect/Schema";
import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import { ExpansionState } from "#schemas/visual-configuration/2.8.0.ts";

import { branch, nest, toggled } from "./expansion.ts";
import { col } from "./field.ts";
import { nil, text } from "./literal.ts";

const keyOrder = (value: unknown): ReadonlyArray<string> =>
	typeof value === "object" && value !== null && !Array.isArray(value)
		? Object.keys(value).concat(Object.values(value).flatMap((item) => keyOrder(item)))
		: Array.isArray(value)
			? value.flatMap((item) => keyOrder(item))
			: [];

describe("nest", () => {
	it("returns a single node unchanged", () => {
		expect(nest(toggled(text("Planning")))).toStrictEqual(toggled(text("Planning")));
	});

	it("makes each node the only child of the node before it", () => {
		expect(nest(branch(text("Key Milestones")), branch(nil), toggled(nil))).toStrictEqual({
			identityValues: [text("Key Milestones")],
			children: [{ identityValues: [nil], children: [{ identityValues: [nil], isToggled: true }] }],
		});
	});

	it("builds the same tree as nested branch and toggled calls", () => {
		const nested = branch(
			text("Key Milestones"),
			branch(nil, toggled(nil, toggled(nil, toggled(text("Phase 1")), toggled(text("Phase 2"))))),
		);
		const flat = nest(
			branch(text("Key Milestones")),
			branch(nil),
			toggled(nil),
			toggled(nil, toggled(text("Phase 1")), toggled(text("Phase 2"))),
		);
		expect(flat).toStrictEqual(nested);
		expect(keyOrder(flat)).toStrictEqual(keyOrder(nested));
	});

	it("keeps the children of the last node", () => {
		const tree = nest(branch(nil), toggled(nil, toggled(text("A")), toggled(text("B"))));
		expect(tree.children[0].children).toStrictEqual([toggled(text("A")), toggled(text("B"))]);
	});

	it("writes children after identityValues and isToggled", () => {
		expect(Object.keys(nest(toggled(nil), branch(nil)))).toStrictEqual([
			"identityValues",
			"isToggled",
			"children",
		]);
	});

	it("replaces the children of every node except the last", () => {
		const tree = nest(branch(nil, toggled(text("Dropped"))), toggled(text("Kept")));
		expect(tree.children).toStrictEqual([toggled(text("Kept"))]);
	});

	it("does not change the nodes it receives", () => {
		const first = branch(text("Key Milestones"));
		const second = toggled(nil);
		nest(first, second);
		expect(first).toStrictEqual({ identityValues: [text("Key Milestones")] });
		expect(second).toStrictEqual({ identityValues: [nil], isToggled: true });
	});

	it("builds a tree that the expansion state schema accepts", () => {
		const state = {
			roles: ["Rows"],
			root: {
				children: [
					nest(
						branch(text("Key Milestones")),
						branch(nil),
						toggled(nil, toggled(text("Phase 1")), toggled(text("Phase 2"))),
					),
				],
			},
		} satisfies typeof ExpansionState.Type;
		expect(decodeUnknownSync(ExpansionState)(state, { onExcessProperty: "error" })).toStrictEqual({
			roles: ["Rows"],
			root: {
				children: [
					{
						identityValues: [{ Literal: { Value: "'Key Milestones'" } }],
						children: [
							{
								identityValues: [{ Literal: { Value: "null" } }],
								children: [
									{
										identityValues: [{ Literal: { Value: "null" } }],
										isToggled: true,
										children: [
											{ identityValues: [{ Literal: { Value: "'Phase 1'" } }], isToggled: true },
											{ identityValues: [{ Literal: { Value: "'Phase 2'" } }], isToggled: true },
										],
									},
								],
							},
						],
					},
				],
			},
		});
	});

	it("accepts only literal values", () => {
		expectTypeOf(nil).toExtend<Parameters<typeof branch>[0]>();
		expectTypeOf(text("Key Milestones")).toExtend<Parameters<typeof toggled>[0]>();
		expectTypeOf(col("SC_Schedule", "WBS")).not.toExtend<Parameters<typeof branch>[0]>();
		expectTypeOf(col("SC_Schedule", "WBS")).not.toExtend<Parameters<typeof toggled>[0]>();
	});

	it("keeps the exact type of each level", () => {
		const tree = nest(branch(text("Key Milestones")), toggled(nil));
		expectTypeOf(tree.identityValues).toEqualTypeOf<readonly [ReturnType<typeof text>]>();
		expectTypeOf(tree.children[0].isToggled).toEqualTypeOf<true>();
	});
});
