import { entry, forField, long, obj, project, role, solid, wildcard } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

import { color, font, shape, size } from "#/design.ts";
import { bySign } from "#/lib/format.ts";
import { hiddenTitle, position, state } from "#/lib/frame.ts";
import type { Field, Placed } from "#/lib/frame.ts";

export interface Tile {
	readonly label: string;
	readonly value: Field;
	readonly note?: Field;
	readonly tone?: Field | { readonly field: Field; readonly inverse: true };
	readonly decimals?: number;
}

export interface KpiStripProps extends Placed {
	readonly label: string;
	readonly tiles: ReadonlyArray<Tile>;
}

const NOTE = "note";

const toneColor = (tone: NonNullable<Tile["tone"]>) =>
	"inverse" in tone ? bySign(tone.field, { up: color.bad, down: color.good }) : bySign(tone);

export const kpiStrip = ({ name, label, at, tiles }: KpiStripProps) => {
	if (tiles.length === 0 || tiles.length > 6) throw new RangeError("kpiStrip: give between 1 and 6 tiles");
	const notes = tiles.flatMap((tile) =>
		tile.note === undefined ? [] : [entry({ value: tile.note }, { ...wildcard(tile.value, 0), id: NOTE })],
	);
	const tones = tiles.flatMap((tile) =>
		tile.tone === undefined ? [] : [entry({ valueFontColor: toneColor(tile.tone) }, wildcard(tile.value))],
	);
	const precision = tiles.flatMap((tile) =>
		tile.decimals === undefined ? [] : [entry({ labelPrecision: long(tile.decimals) }, forField(tile.value))],
	);
	return defineVisual({
		name,
		position: position(at),
		visual: {
			visualType: "cardVisual",
			query: {
				queryState: {
					Data: role(...tiles.map((tile) => project(tile.value, { displayName: tile.label }))),
				},
			},
			objects: {
				layout: obj(
					{
						style: "Table",
						orientation: 2,
						columnCount: tiles.length,
						rowCount: 1,
						maxTiles: tiles.length,
						alignment: "left",
						backgroundShow: false,
						customizeLines: true,
						gridlineWidth: 1,
						gridlineColor: solid(color.rule),
						lineWidth: 0,
						borderWidth: 0,
						paddingUniform: 0,
						showFixedSize: false,
					},
					state.default,
				),
				label: obj(
					{
						show: true,
						position: "aboveValue",
						fontFamily: font.body,
						fontSize: size.label,
						fontColor: solid(color.inkMuted),
						horizontalAlignment: "left",
					},
					state.default,
				),
				value: [
					entry(
						{
							fontFamily: font.figure,
							fontSize: size.kpiValue,
							fontColor: solid(color.ink),
							horizontalAlignment: "left",
							labelDisplayUnits: 1,
						},
						state.default,
					),
					...precision,
				],
				spacing: obj({ verticalSpacing: 0 }, state.default),
				outline: obj({ show: false }, state.default),
				accentBar: obj({ show: false }, state.default),
				fillCustom: obj({ show: false }, state.default),
				padding: obj(
					{
						paddingSelection: "Custom",
						paddingIndividual: true,
						topMargin: 22,
						bottomMargin: 4,
						leftMargin: 12,
						rightMargin: 12,
					},
					state.default,
				),
				divider: obj({ show: false }, state.default),
				...(notes.length === 0
					? {}
					: {
							referenceLabel: notes,
							referenceLabelTitle: obj({ show: false }, state.default),
							referenceLabelValue: [
								entry(
									{
										valueFontFamily: font.body,
										valueFontSize: size.label,
										valueFontColor: solid(color.inkMuted),
										showBlankAs: "–",
									},
									state.default,
								),
								...tones,
							],
							referenceLabelDetail: obj({ show: false }, state.default),
							referenceLabelLayout: obj({ position: "below", arrangement: "rows", style: "sentence" }),
						}),
			},
			visualContainerObjects: {
				title: hiddenTitle(label),
				subTitle: obj({ show: false }),
				background: obj({ show: true, color: solid(color.surface), transparency: 0 }),
				border: obj({ show: true, color: solid(color.rule), radius: shape.radius, width: shape.hairline }),
				padding: obj({ top: 4, bottom: 4, left: 4, right: 4 }),
				visualHeader: obj({ show: false }),
			},
			drillFilterOtherVisuals: true,
		},
	});
};
