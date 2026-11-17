import { isExpression } from "./expression.ts";
import type { Expression } from "./expression.ts";
import { bool, double, text } from "./literal.ts";

export type Value = boolean | number | string | Expression;

export const isValue = (value: unknown): value is Value =>
	typeof value === "boolean" || typeof value === "number" || typeof value === "string" || isExpression(value);

export const toExpression = (value: Value): unknown => {
	if (typeof value === "boolean") return bool(value);
	if (typeof value === "number") return double(value);
	if (typeof value === "string") return text(value);
	return value;
};

export const toProperties = (properties: Readonly<Record<string, unknown>>): unknown =>
	Object.fromEntries(
		Object.entries(properties).map(([key, value]) => [
			key,
			isValue(value) ? { expr: toExpression(value) } : value,
		]),
	);
