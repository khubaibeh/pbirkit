import { Struct } from "effect/Schema";

import { formattingProperties } from "#schemas/common/formatting.ts";

/** The `title` container object: the title text and its look. */
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

/** The `subTitle` container object: the subtitle text and its look. */
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

/** The `divider` container object: the line under the title area. */
export const Divider = Struct(formattingProperties("show", "color", "style", "width", "ignorePadding"));

export type Divider = typeof Divider.Type;

/** The `spacing` container object: the space between the title parts and the plot. */
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

/** The `background` container object: the fill behind the visual. */
export const Background = Struct(formattingProperties("show", "color", "transparency"));

export type Background = typeof Background.Type;

/** The `padding` container object: the space inside the visual border. */
export const Padding = Struct(formattingProperties("top", "bottom", "left", "right"));

export type Padding = typeof Padding.Type;

/** The `lockAspect` container object: when `show` is true, resizes keep the aspect ratio. */
export const LockAspect = Struct(formattingProperties("show"));

export type LockAspect = typeof LockAspect.Type;

/** The `general` container object: position, size, alt text and sampling options. */
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

/** The `dropShadow` container object: the shadow around the visual. */
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

/** The `visualTooltip` container object: the tooltip type, page and look. */
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

/** The `stylePreset` container object: the name of the style preset of the visual. */
export const StylePreset = Struct(formattingProperties("name"));

export type StylePreset = typeof StylePreset.Type;

/** The `visualHeaderTooltip` container object: the help tooltip in the visual header. */
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

/** The property names of the `border` container object. */
export const BorderFields = formattingProperties("show", "color", "radius");

/** The property names of the `visualHeader` container object: the header icons and their look. */
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

/** The property names of the `visualLink` container object: the action that a click on the visual runs. */
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

/**
 * The container objects that all versions share.
 * These style the frame around the chart and go in `visualContainerObjects`, not in `objects`.
 */
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
