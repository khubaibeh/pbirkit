import type { ModelObject, ModelTable } from "./tmdl.ts";

const MEASURE_TABLE = "_Measures";

const SYMBOLS: ReadonlyArray<readonly [RegExp, string]> = [
	[/%/gu, " Pct "],
	[/#/gu, " Count "],
	[/&/gu, " And "],
];

const identifier = (name: string): string => {
	const spelled = SYMBOLS.reduce((text, [pattern, word]) => text.replace(pattern, word), name);
	const words = spelled.split(/[^A-Za-z0-9]+/u).filter(Boolean);
	const [first = "", ...rest] = words;
	const id = [first.toLowerCase(), ...rest.map((word) => word[0]?.toUpperCase() + word.slice(1))].join("");
	if (!/^[a-z][A-Za-z0-9]*$/u.test(id)) throw new Error(`identifier: cannot name ${JSON.stringify(name)}`);
	return id;
};

const literal = (text: string): string => JSON.stringify(text);

const entries = (objects: ReadonlyArray<ModelObject>, call: (object: ModelObject) => string): string => {
	const seen = new Map<string, string>();
	return objects
		.map((object) => {
			const key = identifier(object.name);
			const clash = seen.get(key);
			if (clash !== undefined)
				throw new Error(`codegen: ${literal(object.name)} and ${literal(clash)} both map to ${key}`);
			seen.set(key, object.name);
			return `\t\t${key}: ${call(object)},`;
		})
		.join("\n");
};

export const renderCatalog = (tables: ReadonlyArray<ModelTable>): string => {
	const measures = tables
		.filter((table) => table.name === MEASURE_TABLE)
		.flatMap((table) => table.objects.filter((object) => object.kind === "measure" && !object.isHidden));
	const columnTables = tables
		.filter((table) => table.name !== MEASURE_TABLE && !table.isHidden)
		.map((table) => ({ table, columns: table.objects.filter((o) => o.kind === "column" && !o.isHidden) }))
		.filter(({ columns }) => columns.length > 0);
	const stray = tables.flatMap((table) =>
		table.name === MEASURE_TABLE ? [] : table.objects.filter((object) => object.kind === "measure"),
	);
	if (stray.length > 0)
		throw new Error(
			`codegen: measures belong in ${MEASURE_TABLE}: ${stray.map((m) => `${m.table}[${m.name}]`).join(", ")}`,
		);

	const columnBlocks = columnTables
		.map(
			({ table, columns }) =>
				`\t${identifier(table.name)}: {\n${entries(columns, (c) => `col(${literal(c.table)}, ${literal(c.name)})`)}\n\t},`,
		)
		.join("\n");

	return [
		'import { col, measure } from "pbirkit/expr";',
		"",
		"export const measures = {",
		entries(measures, (m) => `measure(${literal(m.table)}, ${literal(m.name)})`)
			.replaceAll("\n\t\t", "\n\t")
			.replace(/^\t\t/u, "\t"),
		"} as const;",
		"",
		"export const columns = {",
		columnBlocks,
		"} as const;",
		"",
	].join("\n");
};
