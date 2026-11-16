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

export const Divider = Struct(formattingProperties("show", "color", "style", "width", "ignorePadding"));

export const Spacing = Struct(
	formattingProperties(
		"customizeSpacing",
		"spaceBelowTitle",
		"spaceBelowSubTitle",
		"spaceBelowTitleArea",
		"verticalSpacing",
	),
);

export const Background = Struct(formattingProperties("show", "color", "transparency"));

export const Padding = Struct(formattingProperties("top", "bottom", "left", "right"));

export const LockAspect = Struct(formattingProperties("show"));

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

export const StylePreset = Struct(formattingProperties("name"));

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
