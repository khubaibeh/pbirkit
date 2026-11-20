import { HashMap } from "effect";

import type { FileDifference, FileTree } from "@pbirkit/core/diff";

import type { Tree } from "../build/tree.ts";

export const fileTreeOf = (tree: Tree): FileTree =>
	new Map(Array.from(HashMap.values(tree), (file) => [file.path, file.bytes]));

export const renderDiff = (differences: ReadonlyArray<FileDifference>): string => {
	if (differences.length === 0) return "No differences.";

	const counts = { missing: 0, extra: 0, changed: 0 };
	const lines: Array<string> = [];
	for (const difference of differences) {
		counts[difference.kind]++;
		lines.push(`${difference.kind.padEnd(7)}  ${difference.path}`);
		if (difference.kind === "changed") {
			for (const { pointer, expected, actual } of difference.pointers) {
				lines.push(`  ${pointer}  build=${expected}  target=${actual}`);
			}
			if (difference.more > 0) lines.push(`  … ${difference.more} more paths`);
		}
	}
	lines.push(`${counts.missing} missing, ${counts.extra} extra, ${counts.changed} changed`);
	return lines.join("\n");
};
