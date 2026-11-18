import { declare } from "effect/Schema";

import type { Register } from "./register.ts";

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
] as const;

export type BuiltinFontFace = (typeof FONT_FACES)[number];

export type FamilyName<F extends string> = F extends "" | ` ${string}` | `${string} `
	? never
	: F extends `${string}${"," | "'" | '"' | ";"}${string}`
		? never
		: F;

export type FontFaceOf<R> = R extends { readonly fonts: ReadonlyArray<infer F extends string> }
	? BuiltinFontFace | FamilyName<F>
	: BuiltinFontFace;

export type FontFace = FontFaceOf<Register>;

export const FontFace = declare((input: unknown): input is FontFace => typeof input === "string", {
	expected: "a font family",
});

export const font = <const F extends string>(family: F & FamilyName<F>): F => family;

export const isFamilyName = (family: string): boolean =>
	family !== "" && family.trim() === family && !/[,'";]/u.test(family);

export const isFontKey = (key: string): boolean =>
	key === "fontFace" || key === "fontFamily" || key.endsWith("FontFamily");

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

export const isBuiltinFont = (face: string): boolean => FONT_FACES.some((builtin) => builtin === face);
