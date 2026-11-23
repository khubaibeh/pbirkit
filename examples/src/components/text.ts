import { long, obj, project, role, solid } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

import { color, font, size } from "#/design.ts";
import type { FontFace, Hex, TypeSize } from "#/design.ts";
import { bare, position, state } from "#/lib/frame.ts";
import type { Field, Placed } from "#/lib/frame.ts";

export interface Run {
	readonly text: string;
	readonly font?: FontFace;
	readonly size?: TypeSize;
	readonly color?: Hex;
}

export interface TextProps extends Placed {
	readonly label: string;
	readonly paragraphs: ReadonlyArray<ReadonlyArray<Run>>;
}

const run = ({ text, font: face = font.body, size: points = size.body, color: tint = color.ink }: Run) => ({
	value: text,
	textStyle: { fontFamily: face, fontSize: `${points}pt`, color: tint },
});

export const textBlock = ({ name, label, at, paragraphs }: TextProps) =>
	defineVisual({
		name,
		position: position(at),
		visual: {
			visualType: "textbox",
			objects: {
				general: [
					{
						properties: {
							paragraphs: paragraphs.map((runs) => ({
								textRuns: runs.map(run),
								horizontalTextAlignment: "left",
							})),
						},
					},
				],
			},
			visualContainerObjects: bare(label),
			drillFilterOtherVisuals: true,
		},
	});

export interface DynamicTextProps extends Placed {
	readonly label: string;
	readonly value: Field;
	readonly font?: FontFace;
	readonly size?: TypeSize;
	readonly color?: Hex;
	readonly background?: Hex;
}

export const dynamicText = ({
	name,
	label,
	at,
	value,
	font: face = font.body,
	size: points = size.body,
	color: tint = color.inkMuted,
	background = color.paper,
}: DynamicTextProps) =>
	defineVisual({
		name,
		position: position(at),
		visual: {
			visualType: "cardVisual",
			query: { queryState: { Data: role(project(value)) } },
			objects: {
				value: obj(
					{
						fontFamily: face,
						fontSize: points,
						fontColor: solid(tint),
						horizontalAlignment: "left",
						textWrap: true,
					},
					state.default,
				),
				label: obj({ show: false }, state.default),
				layout: obj(
					{
						alignment: "left",
						paddingUniform: long(0),
						backgroundShow: true,
						backgroundFillColor: solid(background),
						backgroundTransparency: 0,
						showFixedSize: false,
					},
					state.default,
				),
				padding: obj({ paddingSelection: "Custom", paddingUniform: long(0) }, state.default),
				outline: obj({ show: false }, state.default),
				accentBar: obj({ show: false }, state.default),
				fillCustom: obj({ show: true, fillColor: solid(background), transparency: 0 }, state.default),
			},
			visualContainerObjects: bare(label),
			drillFilterOtherVisuals: true,
		},
	});
