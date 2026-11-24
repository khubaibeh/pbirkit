import { expect, it } from "vite-plus/test";

import { decodeDesktopTheme, decodeTheme } from "./schemas/theme.ts";

const fluent = {
	name: "Fluent2-CY26SU10",
	dataColors: ["#118DFF", "#12239E"],
	textClasses: { label: { fontSize: 10.5, color: "#252423" } },
	visualStyles: { "*": { "*": { categoryAxis: [{ fontSize: 10.5, titleFontSize: 10.5 }] } } },
	futureProperty: { show: true },
} as const;

it("decodes a Desktop theme with fractional font sizes and keeps its key order", () => {
	const theme = decodeDesktopTheme(fluent);
	expect(theme).toBe(fluent);
	expect(Object.keys(theme)).toEqual(Object.keys(fluent));
	expect(() => decodeTheme({ name: fluent.name, textClasses: fluent.textClasses })).toThrow(
		"Expected a whole number from 8 to 60",
	);
});
