import { isExpression } from "./expression.ts";
import type { Expression } from "./expression.ts";
import { bool, double, text } from "./literal.ts";

/** A plain value or an expression. The formatting helpers turn plain values into literals. */
export type Value = boolean | number | string | Expression;

/** True for a boolean, a number, a text or an expression. */
export const isValue = (value: unknown): value is Value =>
	typeof value === "boolean" || typeof value === "number" || typeof value === "string" || isExpression(value);

/** Turns a plain value into a literal: a boolean, a double or a text. It returns an expression as it is. */
export const toExpression = (value: Value): unknown => {
	if (typeof value === "boolean") return bool(value);
	if (typeof value === "number") return double(value);
	if (typeof value === "string") return text(value);
	return value;
};

/** Turns each plain value in a record into `{ expr }`. Other values stay as they are. */
export const toProperties = (properties: Readonly<Record<string, unknown>>): unknown =>
	Object.fromEntries(
		Object.entries(properties).map(([key, value]) => [
			key,
			isValue(value) ? { expr: toExpression(value) } : value,
		]),
	);
