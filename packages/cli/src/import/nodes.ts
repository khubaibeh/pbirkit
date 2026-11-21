import { Array as Arr, Data, Option, Predicate } from "effect";

import { RecordArg, helperMatch } from "./helpers.ts";
import type { HelperMatch } from "./helpers.ts";

export const LINE_WIDTH = 100;

export class ModuleReference {
	readonly file: string;

	constructor(file: string) {
		this.file = file;
	}
}

export class ModuleMember {
	readonly file: string;
	readonly path: ReadonlyArray<string>;

	constructor(file: string, path: ReadonlyArray<string>) {
		this.file = file;
		this.path = path;
	}
}

export class HelperCall {
	readonly name: string;
	readonly args: ReadonlyArray<unknown>;

	constructor(name: string, args: ReadonlyArray<unknown>) {
		this.name = name;
		this.args = args;
	}
}

export interface Swaps {
	readonly swap: (value: unknown, helper: string | undefined) => Option.Option<unknown>;
	readonly swapKey: (key: string) => Option.Option<ModuleMember>;
	readonly nameOf: (file: string) => string;
}

export const NO_SWAPS: Swaps = {
	swap: () => Option.none(),
	swapKey: () => Option.none(),
	nameOf: (file) => file,
};

type Line = Option.Option<string>;

export type Node = Data.TaggedEnum<{
	Scalar: { readonly text: string; readonly line: Line };
	Module: { readonly file: string; readonly line: Line };
	Member: { readonly file: string; readonly path: ReadonlyArray<string>; readonly line: Line };
	Url: { readonly url: URL; readonly line: Line };
	Constant: { readonly name: string; readonly line: Line };
	Call: { readonly name: string; readonly args: ReadonlyArray<Node>; readonly line: Line };
	List: { readonly items: ReadonlyArray<Node>; readonly line: Line };
	Fields: { readonly entries: ReadonlyArray<readonly [string, Node]>; readonly line: Line };
}>;

export const Node = Data.taggedEnum<Node>();

export const property = (key: string): string =>
	key === "__proto__" ? '["__proto__"]' : /^[A-Za-z_$][\w$]*$/u.test(key) ? key : JSON.stringify(key);

export const memberPath = (path: ReadonlyArray<string>): string => path.map((key) => `.${key}`).join("");

export const toNode = (
	value: unknown,
	idiomatic: boolean,
	{ swap, swapKey, nameOf }: Swaps = NO_SWAPS,
): Node => {
	const fit = (text: string): Line =>
		Option.filter(Option.some(text), (line) => idiomatic && line.length <= LINE_WIDTH);
	const joined = (nodes: ReadonlyArray<Node>, wrap: (parts: ReadonlyArray<string>) => string): Line =>
		Option.flatMap(Option.all(nodes.map(({ line }) => line)), (parts) => fit(wrap(parts)));
	const memberText = ({ file, path }: ModuleMember): string => `${nameOf(file)}${memberPath(path)}`;
	const keyText = (key: string): string =>
		Option.match(swapKey(key), {
			onSome: (member) => `[${memberText(member)}]`,
			onNone: () => property(key),
		});

	const call = ({ name, args }: HelperMatch): Node =>
		Option.match(args, {
			onNone: () => Node.Constant({ name, line: Option.some(name) }),
			onSome: (list) => {
				const nodes = list.map((arg) => visit(arg, name));
				return Node.Call({
					name,
					args: nodes,
					line: joined(nodes, (parts) => `${name}(${parts.join(", ")})`),
				});
			},
		});

	const fields = (item: object): Node => {
		const entries = Object.entries(item).map(([key, entry]) => [keyText(key), visit(entry)] as const);
		return Node.Fields({
			entries,
			line: joined(
				entries.map(([, node]) => node),
				(parts) =>
					parts.length === 0
						? "{}"
						: `{ ${Arr.zipWith(entries, parts, ([key], part) => `${key}: ${part}`).join(", ")} }`,
			),
		});
	};

	const visit = (item: unknown, helper?: string): Node => {
		if (item instanceof ModuleReference) return Node.Module({ file: item.file, line: Option.none() });
		if (item instanceof ModuleMember)
			return Node.Member({
				file: item.file,
				path: item.path,
				line: fit(memberText(item)),
			});
		if (item instanceof HelperCall) return call({ name: item.name, args: Option.some(item.args) });

		const swapped = swap(item, helper);
		if (Option.isSome(swapped)) return visit(swapped.value);

		if (item instanceof URL) return Node.Url({ url: item, line: Option.none() });
		if (item instanceof RecordArg) return fields(item.fields);
		const match = idiomatic ? helperMatch(item) : Option.none<HelperMatch>();
		if (Option.isSome(match)) return call(match.value);
		if (Arr.isArray(item)) {
			const items = item.map((entry) => visit(entry));
			return Node.List({ items, line: joined(items, (parts) => `[${parts.join(", ")}]`) });
		}
		if (Predicate.isObject(item)) return fields(item);
		const text = Object.is(item, -0) ? "-0" : JSON.stringify(item);
		return Node.Scalar({ text, line: fit(text) });
	};

	return visit(value);
};

export const helperNames = (node: Node): ReadonlyArray<string> =>
	Node.$match(node, {
		Scalar: () => [],
		Module: () => [],
		Member: () => [],
		Url: () => [],
		Constant: ({ name }) => [name],
		Call: ({ name, args }) => [name, ...args.flatMap((arg) => helperNames(arg))],
		List: ({ items }) => items.flatMap((item) => helperNames(item)),
		Fields: ({ entries }) => entries.flatMap(([, item]) => helperNames(item)),
	});
