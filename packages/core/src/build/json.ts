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
