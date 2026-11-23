import { defineConfig } from "pbirkit/config";
import { obj } from "pbirkit/expr";
import { themeRef } from "pbirkit/resource";
import { SchemaUrl } from "pbirkit/schemas/schema-url";

import { sitemap } from "#/sitemap.ts";
import pages from "#/pages/index.ts";
import { ledger, resourcePackages, resources } from "#/resources.ts";

const reportVersion = { visual: "2.14.0", report: "3.4.0", page: "2.3.1" } as const;

export default defineConfig({
	name: "Northwind Traders",
	pbip: { version: "1.0", settings: { enableAutoRecovery: true } },
	report: {
		logicalId: "2bd03a78-4827-45bf-8e6b-741799bb1c25",
		platform: { $schema: SchemaUrl.platform["2.0.0"], version: "2.0" },
		pbir: { version: "4.0" },
		definition: {
			$schema: SchemaUrl.report["3.3.0"],
			themeCollection: {
				customTheme: themeRef(ledger, reportVersion),
			},
			objects: {
				section: obj({ verticalAlignment: "Top" }),
				outspacePane: obj({ expanded: false }),
			},
			resourcePackages,
			settings: {
				useStylableVisualContainerHeader: true,
				exportDataMode: "AllowSummarized",
				defaultDrillFilterOtherVisuals: true,
				allowChangeFilterTypes: true,
				useEnhancedTooltips: true,
				useDefaultAggregateDisplayName: true,
			},
		},
		version: { $schema: SchemaUrl.version["1.0.0"], version: "2.0.0" },
		pagesMetadata: { $schema: SchemaUrl.pages["1.1.0"], activePageName: sitemap[0].id },
		pages,
		resources,
	},
	model: {
		name: "Northwind Traders",
		path: "Northwind Traders.SemanticModel",
		logicalId: "7765e0c2-9581-4b4f-84da-307a1dc902e8",
		platform: { $schema: SchemaUrl.platform["2.0.0"], version: "2.0" },
		pbism: { version: "4.2", settings: {} },
		definition: new URL("./model/", import.meta.url),
		editorSettings: {
			version: "1.0",
			autodetectRelationships: false,
			parallelQueryLoading: true,
			typeDetectionEnabled: true,
			relationshipImportEnabled: false,
			shouldNotifyUserOfNameConflictResolution: true,
		},
	},
});
