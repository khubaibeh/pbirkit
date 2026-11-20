import { Array, Boolean, Literals, Number, String, Struct, optionalKey } from "effect/Schema";

import { formattingProperties } from "#schemas/common/formatting.ts";

export const ThemeResourcePackageType = Literals(["RegisteredResources", "SharedResources"]);

export type ThemeResourcePackageType = typeof ThemeResourcePackageType.Type;

export const OutspacePane = Struct(formattingProperties("expanded", "visible"));

export type OutspacePane = typeof OutspacePane.Type;

export const Section = Struct(formattingProperties("verticalAlignment"));

export type Section = typeof Section.Type;

export const ReportFormattingProperties = {
	outspacePane: OutspacePane,
	section: Section,
};

export const ReportSource = Literals([
	"Default",
	"SharePoint",
	"Teams",
	"QuickCreate",
	"EmbedQuickCreate",
	"Datamart",
	"DataExplore",
]);

export type ReportSource = typeof ReportSource.Type;

export const ResourcePackageType = Literals([
	"CustomVisual",
	"RegisteredResources",
	"SharedResources",
	"OrganizationalStoreCustomVisual",
]);

export type ResourcePackageType = typeof ResourcePackageType.Type;

export const ResourcePackageItemType = Literals([
	"CustomVisualJavascript",
	"CustomVisualsCss",
	"CustomVisualScreenshot",
	"CustomVisualIcon",
	"CustomVisualWatermark",
	"CustomVisualMetadata",
	"Image",
	"ShapeMap",
	"CustomTheme",
	"BaseTheme",
	"DashboardTheme",
	"DashboardBaseTheme",
	"HighContrastTheme",
	"AppNavigation",
	"AppTheme",
	"AppBaseTheme",
]);

export type ResourcePackageItemType = typeof ResourcePackageItemType.Type;

export const ResourcePackageItem = Struct({
	id: optionalKey(Number),
	name: String,
	path: String,
	type: ResourcePackageItemType,
});

export type ResourcePackageItem = typeof ResourcePackageItem.Type;

export const ResourcePackage = Struct({
	id: optionalKey(Number),
	name: String,
	type: ResourcePackageType,
	items: Array(ResourcePackageItem),
	disabled: optionalKey(Boolean),
});

export type ResourcePackage = typeof ResourcePackage.Type;

export const OrganizationCustomVisual = Struct({
	name: String,
	path: String,
	disabled: optionalKey(Boolean),
});

export type OrganizationCustomVisual = typeof OrganizationCustomVisual.Type;

export const Annotation = Struct({
	name: String,
	value: String,
});

export type Annotation = typeof Annotation.Type;

export const ExplorationSettingsFields = {
	isPersistentUserStateDisabled: optionalKey(Boolean),
	hideVisualContainerHeader: optionalKey(Boolean),
	useStylableVisualContainerHeader: optionalKey(Boolean),
	exportDataMode: optionalKey(Literals(["AllowSummarized", "AllowSummarizedAndUnderlying", "None"])),
	isReportAnnotationsDisabled: optionalKey(Boolean),
	defaultFilterActionIsDataFilter: optionalKey(Boolean),
	defaultDrillFilterOtherVisuals: optionalKey(Boolean),
	useCrossReportDrillthrough: optionalKey(Boolean),
	allowChangeFilterTypes: optionalKey(Boolean),
	allowInlineExploration: optionalKey(Boolean),
	useEnhancedTooltips: optionalKey(Boolean),
	useScaledTooltips: optionalKey(Boolean),
	filterPaneHiddenInEditMode: optionalKey(Boolean),
	disableFilterPaneSearch: optionalKey(Boolean),
	pagesPosition: optionalKey(Literals(["PagesPane", "Bottom"])),
	allowAutomatedInsightsNotification: optionalKey(Boolean),
	useDefaultAggregateDisplayName: optionalKey(Boolean),
	enableDeveloperMode: optionalKey(Boolean),
	pauseQueries: optionalKey(Boolean),
	queryLimitOption: optionalKey(
		Literals(["None", "Shared", "Premium", "SQLServerAS", "AzureAS", "Custom", "Auto"]),
	),
	customMemoryLimit: optionalKey(String),
	customTimeoutLimit: optionalKey(String),
};

export const ExplorationSlowDataSourceSettings = Struct({
	isCrossHighlightingDisabled: optionalKey(Boolean),
	isSlicerSelectionsButtonEnabled: optionalKey(Boolean),
	isFilterSelectionsButtonEnabled: optionalKey(Boolean),
	isFieldWellButtonEnabled: optionalKey(Boolean),
	isApplyAllButtonEnabled: optionalKey(Boolean),
});

export type ExplorationSlowDataSourceSettings = typeof ExplorationSlowDataSourceSettings.Type;

export const ReportFields = {
	reportSource: optionalKey(ReportSource),
	publicCustomVisuals: optionalKey(Array(String)),
	resourcePackages: optionalKey(Array(ResourcePackage)),
	organizationCustomVisuals: optionalKey(Array(OrganizationCustomVisual)),
	annotations: optionalKey(Array(Annotation)),
	dataSourceVariables: optionalKey(String),
	slowDataSourceSettings: optionalKey(ExplorationSlowDataSourceSettings),
};
