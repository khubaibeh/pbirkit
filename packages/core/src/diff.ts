import { Array as Arr, Predicate } from "effect";

export type FileTree = ReadonlyMap<string, Uint8Array>;

interface PointerDifference {
	readonly pointer: string;
	readonly expected: string;
	readonly actual: string;
}

type ChangedFile = {
	readonly kind: "changed";
	readonly path: string;
	readonly pointers: ReadonlyArray<PointerDifference>;
	readonly more: number;
};

export type FileDifference =
	| { readonly kind: "missing"; readonly path: string }
	| { readonly kind: "extra"; readonly path: string }
	| ChangedFile;

const decoder = new TextDecoder("utf-8", { fatal: true });
const jsonPath = /\.(?:json|pbip|pbir|pbism|platform)$/iu;

const parseJson = (bytes: Uint8Array): unknown => {
	try {
		const value: unknown = JSON.parse(decoder.decode(bytes));
		return value;
	} catch {
		return undefined;
	}
};

const renderValue = (value: unknown): string => {
	const text = JSON.stringify(value) ?? "(absent)";
	return text.length > 80 ? `${text.slice(0, 79)}…` : text;
};

const compareJson = (
	path: string,
	expected: unknown,
	actual: unknown,
	maxPointers: number,
): ChangedFile | undefined => {
	if (expected === undefined || actual === undefined) return { kind: "changed", path, pointers: [], more: 0 };

	const pointers: Array<PointerDifference> = [];
	let more = 0;

	const visit = (left: unknown, right: unknown, pointer: string): void => {
		if (left === right) return;

		if (Arr.isArray(left) && Arr.isArray(right)) {
			for (let index = 0; index < Math.max(left.length, right.length); index++) {
				visit(left[index], right[index], `${pointer}/${index}`);
			}
			return;
		}

		if (Predicate.isReadonlyObject(left) && Predicate.isReadonlyObject(right)) {
			for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].toSorted()) {
				const segment = key.replaceAll("~", "~0").replaceAll("/", "~1");
				visit(
					Object.hasOwn(left, key) ? left[key] : undefined,
					Object.hasOwn(right, key) ? right[key] : undefined,
					`${pointer}/${segment}`,
				);
			}
			return;
		}

		if (pointers.length < maxPointers) {
			pointers.push({ pointer, expected: renderValue(left), actual: renderValue(right) });
		} else {
			more++;
		}
	};

	visit(expected, actual, "");
	return pointers.length > 0 || more > 0 ? { kind: "changed", path, pointers, more } : undefined;
};

export const diffTrees = (
	expected: FileTree,
	actual: FileTree,
	options: { readonly mode: "semantic" | "bytes"; readonly maxPointers: number },
): ReadonlyArray<FileDifference> => {
	const differences: Array<FileDifference> = [];
	for (const path of [...new Set([...expected.keys(), ...actual.keys()])].toSorted()) {
		const left = expected.get(path);
		const right = actual.get(path);

		if (left === undefined) differences.push({ kind: "extra", path });
		else if (right === undefined) differences.push({ kind: "missing", path });
		else if (options.mode === "semantic" && jsonPath.test(path)) {
			const changed = compareJson(path, parseJson(left), parseJson(right), options.maxPointers);
			if (changed !== undefined) differences.push(changed);
		} else if (left.length !== right.length || !left.every((byte, index) => byte === right[index])) {
			differences.push({ kind: "changed", path, pointers: [], more: 0 });
		}
	}
	return differences;
};
