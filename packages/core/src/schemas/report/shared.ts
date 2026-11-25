import { Array, Boolean, Finite, Literals, optionalKey, String, Struct } from "effect/Schema";

import { formattingProperties } from "#schemas/common/formatting.ts";

/** Where a theme lives. `SharedResources` ships with Power BI. `RegisteredResources` sits in the report. */
export const ThemeResourcePackageType = Literals(["RegisteredResources", "SharedResources"]);

export type ThemeResourcePackageType = typeof ThemeResourcePackageType.Type;

/** Formatting of the filter pane, as theme-style property values. */
export const OutspacePane = Struct(formattingProperties("expanded", "visible"));

export type OutspacePane = typeof OutspacePane.Type;

/** Formatting of the page area in the report. */
export const Section = Struct(formattingProperties("verticalAlignment"));

export type Section = typeof Section.Type;

/** The formatting objects that `report.json` takes in `objects`. */
export const ReportFormattingProperties = {
	outspacePane: OutspacePane,
	section: Section,
};

/** How the report came to be. `Default` is a blank report. The rest are quick create and export paths. */
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

/** The kind of resource package. Built-in themes live in `SharedResources`, and report files in `RegisteredResources`. */
export const ResourcePackageType = Literals([
	"CustomVisual",
	"RegisteredResources",
	"SharedResources",
	"OrganizationalStoreCustomVisual",
]);

export type ResourcePackageType = typeof ResourcePackageType.Type;

/** The kind of file in a resource package. */
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

/**
 * One file in a resource package.
 *
 * - `id`: The name that other parts of the report use to refer to the file.
 * - `path`: The file path inside the package folder.
 */
export const ResourcePackageItem = Struct({
	id: optionalKey(Finite),
	name: String,
	path: String,
	type: ResourcePackageItemType,
});

export type ResourcePackageItem = typeof ResourcePackageItem.Type;

/** A set of files that the report uses, such as themes, images or custom visual files. */
export const ResourcePackage = Struct({
	id: optionalKey(Finite),
	name: String,
	type: ResourcePackageType,
	items: Array(ResourcePackageItem),
	disabled: optionalKey(Boolean),
});

export type ResourcePackage = typeof ResourcePackage.Type;

/**
 * A custom visual that the organization approves.
 *
 * - `name`: The visual name.
 * - `path`: Where the organization stores the visual.
 * - `disabled`: True when the organization turns the visual off.
 */
export const OrganizationCustomVisual = Struct({
	name: String,
	path: String,
	disabled: optionalKey(Boolean),
});

export type OrganizationCustomVisual = typeof OrganizationCustomVisual.Type;

/** A name and value pair that the report keeps, such as notes for other tools. */
export const Annotation = Struct({
	name: String,
	value: String,
});

export type Annotation = typeof Annotation.Type;

/**
 * The report `settings` fields that all versions share.
 *
 * - `isPersistentUserStateDisabled`: When true, the report forgets slicer and filter changes that viewers
 *   make.
 * - `hideVisualContainerHeader`: When true, view mode hides the visual header.
 * - `useStylableVisualContainerHeader`: When true, visuals use the new header that themes and `visualHeader`
 *   can format.
 * - `exportDataMode`: What viewers can export: summarized data, also underlying data, or nothing.
 * - `isReportAnnotationsDisabled`: When true, viewers cannot add comments.
 * - `defaultFilterActionIsDataFilter`: When true, a selection in a visual filters other visuals instead of
 *   highlighting them.
 * - `defaultDrillFilterOtherVisuals`: When true, a drill in one visual filters the visuals that interact with
 *   it. A visual can override it.
 * - `useCrossReportDrillthrough`: When true, other reports can drill through to this report.
 * - `allowChangeFilterTypes`: When false, viewers cannot change the filter type in view mode.
 * - `allowInlineExploration`: When true, viewers can personalize visuals in view mode.
 * - `useEnhancedTooltips`: When true, visuals use the modern tooltips.
 * - `useScaledTooltips`: When true, tooltips scale with the canvas zoom.
 * - `filterPaneHiddenInEditMode`: When true, the filter pane stays hidden in view mode.
 * - `disableFilterPaneSearch`: When true, the filter pane has no search box.
 * - `pagesPosition`: Where the page tabs appear: in a side pane, or in a bar below the report.
 * - `allowAutomatedInsightsNotification`: When true, the service makes insights in the background after a
 *   data refresh.
 * - `useDefaultAggregateDisplayName`: When true, field names show the aggregate, such as `Sum of Sales`.
 * - `enableDeveloperMode`: When true, the report can load private custom visuals for testing.
 * - `pauseQueries`: When true, visual edits send no queries until you resume. It helps with slow sources.
 * - `queryLimitOption`: The time and memory limit for one visual query. See
 *   https://learn.microsoft.com/power-bi/create-reports/desktop-set-visual-query-limits
 * - `customMemoryLimit`: The memory limit when `queryLimitOption` is `Custom`.
 * - `customTimeoutLimit`: The time limit when `queryLimitOption` is `Custom`.
 */
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

/**
 * Settings that cut queries against slow sources.
 *
 * - `isCrossHighlightingDisabled`: When true, visuals do not cross-highlight each other.
 * - `isSlicerSelectionsButtonEnabled`: When true, each slicer gets an apply button.
 * - `isFilterSelectionsButtonEnabled`: When true, each filter gets an apply button.
 * - `isFieldWellButtonEnabled`: When true, field changes wait for an apply button.
 * - `isApplyAllButtonEnabled`: When true, the filter pane gets one button that applies all filters.
 */
export const ExplorationSlowDataSourceSettings = Struct({
	isCrossHighlightingDisabled: optionalKey(Boolean),
	isSlicerSelectionsButtonEnabled: optionalKey(Boolean),
	isFilterSelectionsButtonEnabled: optionalKey(Boolean),
	isFieldWellButtonEnabled: optionalKey(Boolean),
	isApplyAllButtonEnabled: optionalKey(Boolean),
});

export type ExplorationSlowDataSourceSettings = typeof ExplorationSlowDataSourceSettings.Type;

/**
 * The `report.json` fields that all versions share.
 *
 * - `publicCustomVisuals`: The names of the AppSource custom visuals that the report uses.
 * - `resourcePackages`: The files that the report uses. The build fills it from `report.resources` when you
 *   leave it out.
 * - `organizationCustomVisuals`: The organization custom visuals that the report uses.
 * - `annotations`: Extra name and value pairs to keep with the report.
 * - `dataSourceVariables`: The state of DirectQuery source variables to override at render time. These do not
 *   set M parameters of the model.
 */
export const ReportFields = {
	reportSource: optionalKey(ReportSource),
	publicCustomVisuals: optionalKey(Array(String)),
	resourcePackages: optionalKey(Array(ResourcePackage)),
	organizationCustomVisuals: optionalKey(Array(OrganizationCustomVisual)),
	annotations: optionalKey(Array(Annotation)),
	dataSourceVariables: optionalKey(String),
	slowDataSourceSettings: optionalKey(ExplorationSlowDataSourceSettings),
};
