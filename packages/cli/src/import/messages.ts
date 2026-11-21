import { isRaw } from "@pbirkit/core/config";
import type { Config } from "@pbirkit/core/config";

import type { Comparison } from "../diff/compare.ts";
import { endingsLine } from "../diff/render.ts";
import type { Fallback } from "./draft.ts";

const count = (total: number, noun: string): string => `${total} ${noun}${total === 1 ? "" : "s"}`;

const shellArg = (value: string): string =>
	/^[\w@%+=:,./-]+$/u.test(value) ? value : `'${value.replaceAll("'", `'\\''`)}'`;

export const diffCommand = (config: string, target: string): string =>
	`pbirkit diff --warnings -c ${shellArg(config)} --target ${shellArg(target)}`;

const rawItems = ({ report }: Config): number =>
	[
		...report.pages,
		...report.pages.flatMap((page) => page.visuals),
		...(report.bookmarks?.items ?? []).flatMap((item) => ("children" in item ? item.children : [item])),
	].filter((item) => isRaw(item)).length;

export const writtenMessage = (
	file: string,
	report: string,
	config: Config,
	fallbacks: ReadonlyArray<Fallback>,
): string => {
	const raw = rawItems(config);
	return [
		`import: wrote ${file}`,
		`import: listed the work left for agents in ${report}`,
		...fallbacks.map(({ label, reason }) => `  ${label}: ${reason}`),
		...(raw === 0
			? []
			: [
					`import: kept ${raw} of the pages, visuals and bookmarks as raw files. To rename one, change the name in its file too.`,
				]),
	].join("\n");
};

export const verifiedMessage = (comparison: Comparison, warnings: number, command: string): string =>
	[
		`import: verified ${count(comparison.checked, "file")}`,
		...endingsLine(comparison.endings),
		...(warnings === 0
			? []
			: [`import: hid ${count(warnings, "check warning")}. Run ${command} to list them.`]),
	].join("\n");
