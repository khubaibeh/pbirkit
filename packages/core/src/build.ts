import type { Config } from "./config.ts";

export interface BuildFile {
	readonly path: string;
	readonly content: string;
}

const INDENT = "  ";

const trimZeros = (digits: string): string =>
	digits.includes(".") ? digits.replace(/0+$/u, "").replace(/\.$/u, "") : digits;

const general = (value: number, precision: number): string => {
	const [mantissa = "", exponentText = "0"] = value.toExponential(precision - 1).split("e");
	const exponent = Number(exponentText);
	if (exponent < -4 || exponent >= precision) {
		return `${trimZeros(mantissa)}E${exponent < 0 ? "-" : "+"}${String(Math.abs(exponent)).padStart(2, "0")}`;
	}
	return trimZeros(value.toPrecision(precision));
};

export const formatNumber = (value: number): string => {
	if (!Number.isFinite(value)) throw new TypeError(`[ERROR] build: cannot write the number ${value} as JSON`);
	if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
	const short = general(value, 15);
	return Number(short) === value ? short : general(value, 17);
};

const formatString = (value: string): string =>
	JSON.stringify(value).replaceAll(
		/[\u0085\u2028\u2029]/gu,
		(char) => `\\u${(char.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`,
	);

const field = (value: object, key: string): unknown => Reflect.get(value, key);

const serialize = (value: unknown, depth: number): string => {
	if (value === null || value === undefined) return "null";
	if (typeof value === "number") return formatNumber(value);
	if (typeof value === "string") return formatString(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value !== "object") throw new TypeError(`[ERROR] build: cannot write a ${typeof value} as JSON`);
	const inner = INDENT.repeat(depth + 1);
	const outer = INDENT.repeat(depth);
	if (Array.isArray(value)) {
		const items: ReadonlyArray<unknown> = value;
		return items.length === 0
			? "[]"
			: `[\n${items.map((item) => `${inner}${serialize(item, depth + 1)}`).join(",\n")}\n${outer}]`;
	}
	const entries = Object.keys(value).flatMap((key) => {
		const item = field(value, key);
		return item === undefined ? [] : [`${inner}${formatString(key)}: ${serialize(item, depth + 1)}`];
	});
	return entries.length === 0 ? "{}" : `{\n${entries.join(",\n")}\n${outer}}`;
};

export const toJson = (value: unknown): string => serialize(value, 0).replaceAll("\n", "\r\n");

const withoutDot = (path: string): string => path.replace(/^\.\//u, "").replace(/\/+$/u, "");

const platform = (
	type: string,
	displayName: string,
	logicalId: string,
	item: Config["model"]["platform"],
) => {
	const { $schema, version, ...metadata } = item;
	return { $schema, metadata: { type, displayName, ...metadata }, config: { version, logicalId } };
};

const pbip = (config: Config, reportPath: string): Record<string, unknown> =>
	Object.fromEntries(
		Object.entries(config.pbip).flatMap(([key, value]): ReadonlyArray<readonly [string, unknown]> =>
			key === "version"
				? [
						[key, value],
						["artifacts", [{ report: { path: reportPath } }]],
					]
				: [[key, value]],
		),
	);

export const buildFiles = (config: Config): ReadonlyArray<BuildFile> => {
	const report = `${config.name}.Report`;
	const model = withoutDot(config.model.path);
	const definition = `${report}/definition`;
	const { extensions, pagesMetadata } = config.report;
	const { $schema, ...pagesRest } = pagesMetadata;
	const files: Array<readonly [string, unknown]> = [
		[`${config.name}.pbip`, pbip(config, report)],
		[`${report}/.platform`, platform("Report", config.name, config.report.logicalId, config.report.platform)],
		[
			`${report}/definition.pbir`,
			{ ...config.report.pbir, datasetReference: { byPath: { path: `../${model}` } } },
		],
		[`${definition}/report.json`, config.report.definition],
		[`${definition}/version.json`, config.report.version],
		[
			`${definition}/pages/pages.json`,
			{ $schema, pageOrder: config.pages.map((page) => page.name), ...pagesRest },
		],
		...(extensions === undefined ? [] : [[`${definition}/reportExtensions.json`, extensions] as const]),
		[
			`${model}/.platform`,
			platform("SemanticModel", config.model.name, config.model.logicalId, config.model.platform),
		],
		[`${model}/definition.pbism`, config.model.pbism],
		...(config.model.modelReference === undefined
			? []
			: [[`${model}/modelReference.json`, config.model.modelReference] as const]),
	];
	for (const page of config.pages) {
		const { visuals, ...rest } = page;
		const folder = `${definition}/pages/${page.name}`;
		files.push([`${folder}/page.json`, rest]);
		for (const visual of visuals) files.push([`${folder}/visuals/${visual.name}/visual.json`, visual]);
	}
	return files.map(([path, value]) => ({ path, content: toJson(value) }));
};
