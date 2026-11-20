import { Array, Boolean, Literals, Number, String, Struct, optionalKey } from "effect/Schema";
import type { Constraint } from "effect/Schema";

import { formattingObjects, formattingProperties } from "#schemas/common/formatting.ts";
import { Background, LockAspect } from "#schemas/visual-configuration/formatting.ts";

export const PositionFields = {
	x: Number,
	y: Number,
	z: optionalKey(Number),
	width: Number,
	height: Number,
	tabOrder: optionalKey(Number),
};

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

export const GroupLayoutMode = Literals(["ScaleMode", "ScrollMode"]);

export type GroupLayoutMode = typeof GroupLayoutMode.Type;

export const VisualGroupGeneral = Struct(formattingProperties("x", "y", "width", "height", "altText"));

export type VisualGroupGeneral = typeof VisualGroupGeneral.Type;

export const VisualGroupFormattingProperties = {
	background: Background,
	lockAspect: LockAspect,
	general: VisualGroupGeneral,
};

export const visualGroupConfig = <S extends Constraint>(Selector: S) =>
	Struct({
		displayName: String,
		groupMode: GroupLayoutMode,
		objects: optionalKey(formattingObjects(Selector, VisualGroupFormattingProperties)),
	});

export const Annotation = Struct({
	name: String,
	value: String,
});

export type Annotation = typeof Annotation.Type;

export const VisualContainerFields = {
	name: String,
	parentGroupName: optionalKey(String),
	isHidden: optionalKey(Boolean),
	annotations: optionalKey(Array(Annotation)),
};
