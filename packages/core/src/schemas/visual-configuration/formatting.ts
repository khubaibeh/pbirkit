import { Struct } from "effect/Schema";

import { formattingProperties } from "#schemas/common/formatting.ts";

export const Title = Struct(
	formattingProperties(
		"show",
		"text",
		"heading",
		"titleWrap",
		"fontColor",
		"background",
		"alignment",
		"fontSize",
		"fontFamily",
		"bold",
		"italic",
		"underline",
	),
);

export type Title = typeof Title.Type;

export const SubTitle = Struct(
	formattingProperties(
		"show",
		"text",
		"heading",
		"titleWrap",
		"fontColor",
		"alignment",
		"fontSize",
		"fontFamily",
		"bold",
		"italic",
		"underline",
	),
);

export type SubTitle = typeof SubTitle.Type;

export const Divider = Struct(formattingProperties("show", "color", "style", "width", "ignorePadding"));

export type Divider = typeof Divider.Type;

export const Spacing = Struct(
	formattingProperties(
		"customizeSpacing",
		"spaceBelowTitle",
		"spaceBelowSubTitle",
		"spaceBelowTitleArea",
		"verticalSpacing",
	),
);

export type Spacing = typeof Spacing.Type;

export const Background = Struct(formattingProperties("show", "color", "transparency"));

export type Background = typeof Background.Type;

export const Padding = Struct(formattingProperties("top", "bottom", "left", "right"));

export type Padding = typeof Padding.Type;

export const LockAspect = Struct(formattingProperties("show"));

export type LockAspect = typeof LockAspect.Type;

export const General = Struct(
	formattingProperties(
		"x",
		"y",
		"width",
		"height",
		"altText",
		"keepLayerOrder",
		"allowBinnedLineSample",
		"allowOverlappingPointsSample",
	),
);

export type General = typeof General.Type;

export const DropShadow = Struct(
	formattingProperties(
		"show",
		"preset",
		"position",
		"color",
		"transparency",
		"shadowSpread",
		"shadowBlur",
		"angle",
		"shadowDistance",
	),
);

export type DropShadow = typeof DropShadow.Type;

export const VisualTooltip = Struct(
	formattingProperties(
		"show",
		"section",
		"type",
		"titleFontColor",
		"valueFontColor",
		"fontSize",
		"fontFamily",
		"bold",
		"italic",
		"underline",
		"background",
		"transparency",
		"themedBackground",
		"themedTitleFontColor",
		"themedValueFontColor",
		"actionFontColor",
	),
);

export type VisualTooltip = typeof VisualTooltip.Type;

export const StylePreset = Struct(formattingProperties("name"));

export type StylePreset = typeof StylePreset.Type;

export const VisualHeaderTooltip = Struct(
	formattingProperties(
		"section",
		"type",
		"text",
		"titleFontColor",
		"fontSize",
		"fontFamily",
		"bold",
		"italic",
		"underline",
		"background",
		"transparency",
		"themedBackground",
		"themedTitleFontColor",
	),
);

export type VisualHeaderTooltip = typeof VisualHeaderTooltip.Type;

export const BorderFields = formattingProperties("show", "color", "radius");

export const VisualHeaderFields = formattingProperties(
	"show",
	"background",
	"border",
	"transparency",
	"foreground",
	"showVisualInformationButton",
	"showVisualWarningButton",
	"showVisualErrorButton",
	"showDrillRoleSelector",
	"showDrillUpButton",
	"showDrillToggleButton",
	"showDrillDownLevelButton",
	"showDrillDownExpandButton",
	"showPinButton",
	"showFocusModeButton",
	"showFilterRestatementButton",
	"showSeeDataLayoutToggleButton",
	"showOptionsMenu",
	"showTooltipButton",
	"showSmartNarrativeButton",
	"showCommentButton",
	"showPersonalizeVisualButton",
	"showCopyVisualImageButton",
);

export const VisualLinkFields = formattingProperties(
	"show",
	"type",
	"bookmark",
	"drillthroughSection",
	"navigationSection",
	"webUrl",
	"qna",
	"tooltip",
	"tooltipPlaceholderText",
	"showDefaultTooltip",
	"suppressDefaultTooltip",
	"enabledTooltip",
	"disabledTooltip",
);

export const VisualContainerFormattingProperties = {
	title: Title,
	subTitle: SubTitle,
	divider: Divider,
	spacing: Spacing,
	background: Background,
	padding: Padding,
	lockAspect: LockAspect,
	general: General,
	dropShadow: DropShadow,
	visualTooltip: VisualTooltip,
	stylePreset: StylePreset,
	visualHeaderTooltip: VisualHeaderTooltip,
};
