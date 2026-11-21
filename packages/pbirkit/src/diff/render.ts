import type { Comparison } from "./compare.ts";

const files = (count: number): string => `${count} ${count === 1 ? "file" : "files"}`;

export const endingsLine = (endings: ReadonlyArray<string>): ReadonlyArray<string> =>
	endings.length === 0
		? []
		: [
				`${files(endings.length)} ${endings.length === 1 ? "differs" : "differ"} only in line endings or a BOM. Build writes generated JSON with CRLF and no BOM, and converts copied .json and .tmdl files to CRLF.`,
			];

export const renderComparison = ({ differences, endings, checked }: Comparison): string => {
	if (differences.length === 0)
		return [`No differences in ${files(checked)}.`, ...endingsLine(endings)].join("\n");

	const counts = { missing: 0, extra: 0, changed: 0 };
	const lines: Array<string> = [];
	for (const difference of differences) {
		counts[difference.kind]++;
		lines.push(`${difference.kind.padEnd(7)}  ${difference.path}`);
		if (difference.kind !== "changed") continue;
		for (const { pointer, expected, actual } of difference.pointers)
			lines.push(`  ${pointer}  build=${expected}  target=${actual}`);
		if (difference.more > 0) lines.push(`  … ${difference.more} more paths`);
	}
	lines.push(`${counts.missing} missing, ${counts.extra} extra, ${counts.changed} changed`);
	return [...lines, ...endingsLine(endings)].join("\n");
};
