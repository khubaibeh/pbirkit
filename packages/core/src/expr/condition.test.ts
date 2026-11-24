import { expectTypeOf, it } from "vite-plus/test";

import type { Selector } from "#schemas/formatting-object-definitions/1.5.0.ts";
import type { QueryExpressionContainer as QueryV1_0 } from "#schemas/semantic-query/1.0.0.ts";
import type { QueryExpressionContainer as QueryV1_4 } from "#schemas/semantic-query/1.4.0.ts";

import { and, contains, eq, gt, gte, isIn, lt, lte, not, or, startsWith, when } from "./condition.ts";
import type { Field } from "./expression.ts";
import { col, measure } from "./field.ts";
import { double, literal, text } from "./literal.ts";

const region: Field = col("Customer", "Region");
const sales: Field = measure("_Measures", "Net Sales");

const conditions = [
	eq(region, text("West")),
	gt(sales, double(1)),
	gte(sales, double(1)),
	lt(sales, double(1)),
	lte(sales, double(1)),
	and(eq(region, text("West")), not(contains(region, text("a")))),
	or(startsWith(region, text("b")), isIn([region], [[text("West")]])),
	when([[eq(region, text("West")), literal("'#FF0000'")]]),
] as const;

it("fits conditions on a Field into the oldest and newest semantic query versions", () => {
	expectTypeOf(conditions).toExtend<ReadonlyArray<QueryV1_0>>();
	expectTypeOf(conditions).toExtend<ReadonlyArray<QueryV1_4>>();
	expectTypeOf({ data: [{ scopeId: eq(region, text("West")) }] }).toExtend<Selector>();
});
