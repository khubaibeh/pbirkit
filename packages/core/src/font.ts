import { declare } from "effect/Schema";

import type { Register, RegisterEntries } from "./register.ts";

export const FONT_FACES = [
	"Arial",
	"Arial Black",
	"Arial Unicode MS",
	"Calibri",
	"Cambria",
	"Cambria Math",
	"Candara",
	"Comic Sans MS",
	"Consolas",
	"Constantia",
	"Corbel",
	"Courier New",
	"DIN",
	"DIN Light",
	"Georgia",
	"Lucida Sans Unicode",
	"Segoe UI",
	"Segoe UI Bold",
	"Segoe UI Light",
	"Segoe UI Semibold",
	"Symbol",
	"Tahoma",
	"Times New Roman",
	"Trebuchet MS",
	"Verdana",
	"Wingdings",
	"wf_standard-font, helvetica, arial, sans-serif",
	"'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif",
	"'Segoe UI Light', wf_segoe-ui_light, helvetica, arial, sans-serif",
	"'Segoe UI Semibold', wf_segoe-ui_semibold, helvetica, arial, sans-serif",
	"'Segoe UI Bold', wf_segoe-ui_bold, helvetica, arial, sans-serif",
	"'''Segoe UI Semibold'', wf_segoe-ui_semibold, helvetica, arial, sans-serif'",
] as const;

export type BuiltinFontFace = (typeof FONT_FACES)[number];

export type FamilyName<F extends string> = F extends "" | ` ${string}` | `${string} `
	? never
	: F extends `${string}${"," | "'" | '"' | ";"}${string}`
		? never
		: F;

export const FALLBACK_FONTS = ["helvetica", "arial", "sans-serif", "serif", "monospace"] as const;

export type WebFont = `wf_${string}`;

type BuiltinFamily = Exclude<BuiltinFontFace, `${string}${"," | "'"}${string}`>;

type Space = " " | "\t" | "\n" | "\r";

type Trim<S extends string> = S extends `${Space}${infer T}`
	? Trim<T>
	: S extends `${infer T}${Space}`
		? Trim<T>
		: S;

type Unquote<S extends string> = S extends `'${infer T}'` ? T : S extends `"${infer T}"` ? T : S;

type Family<S extends string> = Unquote<Trim<S>>;

export type Families<S extends string, A extends string = never> = S extends `${infer H},${infer T}`
	? Families<T, A | Family<H>>
	: A | Family<S>;

type Quoted<F extends string> = F | `'${F}'` | `"${F}"`;

export type FontStack<F extends string> = Quoted<F> | `${Quoted<F>},${string}`;

type RegisteredOf<R> = R extends { readonly fonts: ReadonlyArray<infer F extends string> }
	? FamilyName<Families<F>>
	: never;

type KnownFamily<R> =
	| BuiltinFamily
	| (typeof FALLBACK_FONTS)[number]
	| WebFont
	| RegisteredOf<RegisterEntries<R>>;

export type FontFaceOf<R> = BuiltinFontFace | FontStack<KnownFamily<R> | Lowercase<KnownFamily<R>>>;

export type FontFace = FontFaceOf<Register>;

export const FontFace = declare(
	(input: unknown): input is FontFace => typeof input === "string" && isFontStack(input),
	{ expected: "a font family, or a stack of font families separated by commas" },
);

export const font = <const F extends string>(family: F & FamilyName<F>): F => family;

export const isFamilyName = (family: string): boolean =>
	family !== "" && family.trim() === family && !/[,'";]/u.test(family);

export const isFontKey = (key: string): boolean =>
	key === "fontFace" || key === "fontFamily" || key.endsWith("FontFamily");

const unquote = (part: string): string => /^(['"])(.*)\1$/su.exec(part)?.[2] ?? part;

export const fontFamilies = (face: string): ReadonlyArray<string> =>
	face.split(",").map((part) => unquote(part.trim()));

export const isBuiltinFont = (face: string): boolean => FONT_FACES.some((builtin) => builtin === face);

export const isFontStack = (face: string): boolean =>
	isBuiltinFont(face) || fontFamilies(face).every((family) => isFamilyName(family));

const BUILTIN_FAMILIES: ReadonlySet<string> = new Set(
	[...FONT_FACES.flatMap((face) => fontFamilies(face)), ...FALLBACK_FONTS]
		.filter((family) => isFamilyName(family))
		.map((family) => family.toLowerCase()),
);

export const registeredFamilies = (fonts: ReadonlyArray<string>): ReadonlySet<string> =>
	new Set(fonts.flatMap((entry) => fontFamilies(entry)).map((family) => family.toLowerCase()));

export const unknownFamilies = (face: string, registered: ReadonlySet<string>): ReadonlyArray<string> =>
	isBuiltinFont(face)
		? []
		: fontFamilies(face).filter((family) => {
				const name = family.toLowerCase();
				return (
					!isFamilyName(family) ||
					!(name.startsWith("wf_") || BUILTIN_FAMILIES.has(name) || registered.has(name))
				);
			});

export const MIN_FONT_SIZE = 8;

export const MAX_FONT_SIZE = 60;

type Upto<N extends number, A extends ReadonlyArray<number> = []> = A["length"] extends N
	? A[number]
	: Upto<N, readonly [...A, A["length"]]>;

export type FontSize = Exclude<Upto<61>, Upto<8>>;

export const isFontSize = (size: unknown): size is FontSize =>
	typeof size === "number" && Number.isInteger(size) && size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE;

export const FontSize = declare(isFontSize, {
	expected: `a whole number from ${MIN_FONT_SIZE} to ${MAX_FONT_SIZE}`,
});

export const isFontSizeKey = (key: string): boolean =>
	key === "fontSize" || key === "textSize" || key.endsWith("FontSize") || key.endsWith("TextSize");
