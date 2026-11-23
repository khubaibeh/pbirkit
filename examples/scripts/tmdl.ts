import { readdirSync, readFileSync } from "node:fs";

export const definition = new URL("../model/", import.meta.url);

export interface ModelObject {
	readonly kind: "column" | "measure";
	readonly table: string;
	readonly name: string;
	readonly isHidden: boolean;
	readonly description: string | undefined;
	readonly displayFolder: string | undefined;
	readonly formatString: string | undefined;
}

export interface ModelTable {
	readonly name: string;
	readonly isHidden: boolean;
	readonly objects: ReadonlyArray<ModelObject>;
}

const TABLE = /^table (?<name>.+)$/u;
const MEMBER = /^\t(?<kind>column|measure) (?<name>'(?:[^']|'')+'|[^\s=]+)/u;
const PROPERTY = /^\t\t(?<key>[A-Za-z]+)(?:: (?<value>.*))?$/u;
const TABLE_PROPERTY = /^\t(?<key>[A-Za-z]+)(?:: (?<value>.*))?$/u;
const DOC = /^\t?\/\/\/ ?(?<text>.*)$/u;

const unquote = (name: string): string =>
	name.startsWith("'") && name.endsWith("'") ? name.slice(1, -1).replaceAll("''", "'") : name;

interface Draft {
	kind: ModelObject["kind"];
	name: string;
	isHidden: boolean;
	description: string | undefined;
	displayFolder: string | undefined;
	formatString: string | undefined;
}

const parseTableFile = (source: string): ModelTable => {
	let tableName: string | undefined;
	let tableHidden = false;
	let pendingDoc: Array<string> = [];
	const drafts: Array<Draft> = [];
	let current: Draft | undefined;

	for (const line of source.split(/\r?\n/u)) {
		const doc = DOC.exec(line);
		if (doc) {
			pendingDoc.push(doc.groups?.["text"] ?? "");
			continue;
		}
		const table = TABLE.exec(line);
		if (table) {
			tableName = unquote(table.groups?.["name"] ?? "");
			pendingDoc = [];
			continue;
		}
		const member = MEMBER.exec(line);
		if (member) {
			current = {
				kind: member.groups?.["kind"] === "measure" ? "measure" : "column",
				name: unquote(member.groups?.["name"] ?? ""),
				isHidden: false,
				description: pendingDoc.length > 0 ? pendingDoc.join("\n") : undefined,
				displayFolder: undefined,
				formatString: undefined,
			};
			drafts.push(current);
			pendingDoc = [];
			continue;
		}
		if (/^\t[a-z]/u.test(line)) {
			current = undefined;
			const property = TABLE_PROPERTY.exec(line);
			if (property?.groups?.["key"] === "isHidden") tableHidden = true;
			pendingDoc = [];
			continue;
		}
		const property = PROPERTY.exec(line);
		if (property && current) {
			const value = property.groups?.["value"];
			switch (property.groups?.["key"]) {
				case "isHidden":
					current.isHidden = true;
					break;
				case "displayFolder":
					current.displayFolder = value;
					break;
				case "formatString":
					current.formatString = value;
					break;
			}
		}
	}

	if (tableName === undefined) throw new Error("parseTableFile: no `table` declaration found");
	const name = tableName;
	return { name, isHidden: tableHidden, objects: drafts.map((draft) => ({ ...draft, table: name })) };
};

export const readModel = (definition: URL): ReadonlyArray<ModelTable> => {
	const folder = new URL("tables/", definition);
	return readdirSync(folder)
		.filter((file) => file.endsWith(".tmdl"))
		.sort()
		.map((file) => parseTableFile(readFileSync(new URL(file, folder), "utf8")));
};
