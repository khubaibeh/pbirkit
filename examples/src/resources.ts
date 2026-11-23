import { customTheme } from "pbirkit/resource";

import { ledgerTheme } from "#/themes/ledger.ts";

export const ledger = customTheme({ name: "Ledger.json", theme: ledgerTheme });

export const resources = [ledger];

export const resourcePackages = [
	{
		name: "RegisteredResources",
		type: "RegisteredResources",
		items: [{ name: ledger.name, path: ledger.name, type: "CustomTheme" }],
	},
] as const;
