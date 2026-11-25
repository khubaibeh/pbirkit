import { Array, Boolean, Finite, Literals, optionalKey, String, Struct } from "effect/Schema";
import type { Constraint } from "effect/Schema";

import { formattingObjects, formattingProperties } from "#schemas/common/formatting.ts";
import { Background, LockAspect } from "#schemas/visual-configuration/formatting.ts";

/**
 * The position fields that all versions share, in page pixels.
 *
 * - `x`: The left edge. Keep it between 0 and the page width.
 * - `y`: The top edge. Keep it between 0 and the page height.
 * - `z`: The stack order. A higher value draws on top.
 * - `width`: The width. Keep `x + width` within the page width.
 * - `height`: The height. Keep `y + height` within the page height.
 * - `tabOrder`: The order of the visual when the user moves through visuals with the Tab key.
 */
export const PositionFields = {
	x: Finite,
	y: Finite,
	z: optionalKey(Finite),
	width: Finite,
	height: Finite,
	tabOrder: optionalKey(Finite),
};

/** How a visual came to be. Desktop writes it, and it does not change how the visual works. */
export const HowCreatedValues = [
	"Default",
	"Copilot",
	"CheckboxTickedInFieldList",
	"DraggedToCanvas",
	"VisualTypeIconClicked",
	"DraggedToFieldWell",
	"InsertVisualButton",
	"WhatIfParameterControl",
	"QnaAppBar",
	"QnaDoubleClick",
	"QnaKeyboardShortcut",
	"FieldParameterControl",
	"CanvasBackgroundContextMenu",
	"ContextMenuPaste",
	"CopyPaste",
] as const;

/**
 * How a group lays out its visuals.
 * `ScaleMode` scales them with the group and keeps the aspect ratio. `ScrollMode` keeps their size and adds a scroll bar.
 */
export const GroupLayoutMode = Literals(["ScaleMode", "ScrollMode"]);

export type GroupLayoutMode = typeof GroupLayoutMode.Type;

/** The `general` formatting object of a group: position, size and alt text. */
export const VisualGroupGeneral = Struct(formattingProperties("x", "y", "width", "height", "altText"));

export type VisualGroupGeneral = typeof VisualGroupGeneral.Type;

/** The formatting objects that a group takes in `objects`. */
export const VisualGroupFormattingProperties = {
	background: Background,
	lockAspect: LockAspect,
	general: VisualGroupGeneral,
};

/**
 * Builds the schema of a visual group. A group holds visuals whose `parentGroupName` is the group `name`.
 *
 * - `displayName`: The group name that the selection pane shows.
 * - `groupMode`: How the group lays out its visuals.
 * - `objects`: Group formatting, such as `background` and `lockAspect`.
 */
export const visualGroupConfig = <S extends Constraint>(Selector: S) =>
	Struct({
		displayName: String,
		groupMode: GroupLayoutMode,
		objects: optionalKey(formattingObjects(Selector, VisualGroupFormattingProperties)),
	});

/** A name and value pair that the visual keeps, such as notes for other tools. */
export const Annotation = Struct({
	name: String,
	value: String,
});

export type Annotation = typeof Annotation.Type;

/**
 * The `visual.json` fields that all versions share.
 *
 * - `name`: The visual id. It must be unique on the page, and it names the visual folder.
 * - `parentGroupName`: The `name` of the group that holds this visual, if any.
 * - `isHidden`: When true, the visual is hidden.
 * - `annotations`: Extra name and value pairs to keep with the visual.
 */
export const VisualContainerFields = {
	name: String,
	parentGroupName: optionalKey(String),
	isHidden: optionalKey(Boolean),
	annotations: optionalKey(Array(Annotation)),
};
