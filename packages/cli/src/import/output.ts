import { posix } from "node:path";

import type { TreeFile } from "../build/tree.ts";
import { hash, treeFile } from "../build/tree.ts";

export const CONFIG_FILE = "pbirkit.config.ts";

type VisualRegistration = {
	readonly visuals: ReadonlyArray<{ readonly guid: string }>;
	readonly builtinVisuals: ReadonlyArray<string>;
};

class ModuleReference {
	readonly file: string;
	readonly data: unknown;

	constructor(file: string, data: unknown) {
		this.file = file;
		this.data = data;
	}
}

class AssetReference {
	readonly file: string;

	constructor(file: string) {
		this.file = file;
	}
}

const encoder = new TextEncoder();
const relativeTo = (file: string, target: string) => {
	const relative = posix.relative(posix.dirname(file), target);
	return relative.startsWith("../") ? relative : `./${relative}`;
};

const urlPath = (path: string) =>
	path
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/");

const property = (key: string) =>
	key === "__proto__" ? '["__proto__"]' : /^[A-Za-z_$][\w$]*$/u.test(key) ? key : JSON.stringify(key);

const identifier = (target: string) => {
	const name = posix.basename(target, ".ts");
	const prefix = name === "page" ? posix.basename(posix.dirname(target)) : name;
	return `_${prefix.replaceAll(/[^\w$]/gu, "_")}`;
};

export class ImportOutput {
	readonly files: Array<TreeFile> = [];
	readonly directories: Array<string> = [];
	readonly fallbacks: Array<{ readonly group: string; readonly reason: string }> = [];

	asset(folder: string, file: TreeFile) {
		const target = `assets/${folder}/${file.path}`;
		this.files.push({ ...file, path: target });
		return new AssetReference(target);
	}

	assetFolder(folder: string, relative: string, files: ReadonlyArray<TreeFile>) {
		const target = `assets/${folder}/${relative}`;
		this.directories.push(target);
		for (const file of files) this.asset(folder, file);
		return new AssetReference(`${target}/`);
	}

	fallback(group: string, reason: string) {
		this.fallbacks.push({ group, reason });
	}

	resolve(value: unknown): unknown {
		if (value instanceof ModuleReference) return this.resolve(value.data);
		if (value instanceof AssetReference) return new URL(urlPath(value.file), "file:///");
		if (Array.isArray(value)) return value.map((item: unknown) => this.resolve(item));
		if (typeof value === "object" && value !== null) {
			return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.resolve(item)]));
		}
		return value;
	}

	module(file: string, data: unknown, registration?: VisualRegistration) {
		const imports = new Map<string, string>();
		const names = new Set<string>();
		const isConfig = file === CONFIG_FILE;

		const render = (value: unknown, depth: number): string => {
			if (value instanceof ModuleReference) {
				const known = imports.get(value.file);
				if (known !== undefined) return known;
				const base = identifier(value.file);
				let name = base;
				for (let suffix = 2; names.has(name); suffix += 1) name = `${base}_${suffix}`;
				names.add(name);
				imports.set(value.file, name);
				return name;
			}
			if (value instanceof AssetReference) {
				return `new URL(${JSON.stringify(urlPath(relativeTo(file, value.file)))}, import.meta.url)`;
			}

			const indent = "\t".repeat(depth);
			const block = (open: string, items: ReadonlyArray<string>, close: string) =>
				items.length === 0
					? `${open}${close}`
					: `${open}\n${items.map((item) => `${indent}\t${item},\n`).join("")}${indent}${close}`;

			if (Array.isArray(value)) {
				return block(
					"[",
					value.map((item: unknown) => render(item, depth + 1)),
					"]",
				);
			}
			if (typeof value === "object" && value !== null) {
				return block(
					"{",
					Object.entries(value).map(([key, item]) => `${property(key)}: ${render(item, depth + 1)}`),
					"}",
				);
			}

			return JSON.stringify(value);
		};

		const body = render(data, 0);
		const lines = [
			...(isConfig ? ['import { defineConfig } from "@pbirkit/core/config";'] : []),
			...Array.from(
				imports,
				([target, name]) => `import ${name} from ${JSON.stringify(relativeTo(file, target))};`,
			),
		];
		if (lines.length > 0) lines.push("");
		if (
			registration !== undefined &&
			(registration.visuals.length > 0 || registration.builtinVisuals.length > 0)
		) {
			const registerBody = render(registration, 2);
			const key = `import:${hash(encoder.encode(registerBody)).slice(0, 16)}`;
			lines.push(
				'declare module "@pbirkit/core/register" {',
				"\tinterface Register {",
				`\t\treadonly ${JSON.stringify(key)}: ${registerBody};`,
				"\t}",
				"}",
				"",
			);
		}
		lines.push(isConfig ? `export default defineConfig(${body});` : `export default ${body} as const;`, "");
		this.files.push(treeFile(file, encoder.encode(lines.join("\n"))));

		return new ModuleReference(file, data);
	}
}
