import { inValues, obj, project, role, solid } from "pbirkit/expr";
import type { Value } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

import { color, font, shape, size } from "#/design.ts";
import { position } from "#/lib/frame.ts";
import type { Field, Placed } from "#/lib/frame.ts";

export interface DropdownProps extends Placed {
	readonly field: Field;
	readonly label: string;
	readonly sync?: string;
	readonly single?: boolean;
	readonly selected?: ReadonlyArray<Value>;
}

export const dropdown = ({ name, at, field, label, sync, single = false, selected = [] }: DropdownProps) =>
	defineVisual({
		name,
		position: position(at),
		visual: {
			visualType: "slicer",
			query: { queryState: { Values: role(project(field, { active: true })) } },
			objects: {
				data: obj({ mode: "Dropdown" }),
				...(selected.length === 0 ? {} : { general: obj({ filter: { filter: inValues(field, selected) } }) }),
				header: obj({
					show: true,
					text: label,
					fontFamily: font.strong,
					textSize: size.eyebrow,
					fontColor: solid(color.inkMuted),
				}),
				items: obj({
					fontFamily: font.body,
					textSize: size.table,
					fontColor: solid(color.ink),
					background: solid(color.surface),
				}),
				dropdown: obj({
					borderRadius: shape.radius,
					iconColor: solid(color.inkMuted),
					accentBarShow: false,
				}),
				selection: obj({ strictSingleSelect: single, singleSelect: !single, selectAllCheckboxEnabled: !single }),
			},
			visualContainerObjects: {
				background: obj({ show: false }),
				border: obj({ show: false }),
				title: obj({ show: false }),
				subTitle: obj({ show: false }),
				visualHeader: obj({ show: false }),
				padding: obj({ top: 0, bottom: 0, left: 0, right: 0 }),
			},
			...(sync === undefined ? {} : { syncGroup: { groupName: sync, fieldChanges: true, filterChanges: true } }),
			drillFilterOtherVisuals: true,
		},
	});
