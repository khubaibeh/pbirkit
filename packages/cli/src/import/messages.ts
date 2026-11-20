import type { Fallback } from "./draft.ts";

const count = (total: number, noun: string): string => `${total} ${noun}${total === 1 ? "" : "s"}`;

export const writtenMessage = (config: string, fallbacks: ReadonlyArray<Fallback>): string =>
	[`import: wrote ${config}`, ...fallbacks.map(({ label, reason }) => `  ${label}: ${reason}`)].join("\n");

export const verifiedMessage = (checked: number, warnings: number): string =>
	[
		`import: verified ${count(checked, "file")}`,
		...(warnings === 0
			? []
			: [`import: hid ${count(warnings, "check warning")}. Run pbirkit diff --warnings to list them.`]),
	].join("\n");
