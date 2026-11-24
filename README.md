# pbirkit

Write Power BI reports in TypeScript.

[![npm](https://img.shields.io/npm/v/pbirkit)](https://www.npmjs.com/package/pbirkit) [![license](https://img.shields.io/npm/l/pbirkit)](LICENSE) ![status](https://img.shields.io/badge/status-experimental-orange)

pbirkit turns typed TypeScript modules into a Power BI project (PBIP).
The build writes each report file as Power BI Desktop writes it: the same JSON, and in most cases the same bytes.
The semantic model stays as plain TMDL files.

pbirkit is built first for coding agents. An agent writes and changes the report in TS, and the person checks the result in Power BI Desktop. People can use it by hand too, but the docs, checks and messages are written for agents.

> [!WARNING]
> pbirkit is experimental. APIs can change in any release before 1.0.

## Install

```sh
npm i -D pbirkit typescript
npx pbirkit --version
```

With pnpm:

```sh
pnpm add -D pbirkit typescript
pnpm exec pbirkit --version
```

To run a command before an install, such as the import below, use `npx pbirkit` or `pnpm dlx pbirkit`. If pnpm blocks a new release because of its minimum release age, add `pbirkit` to `minimumReleaseAgeExclude`.

One package holds the `pbirkit` command and every module that a report imports.

## Requirements

| Tool                                                                       | Version     | Why                                              |
| -------------------------------------------------------------------------- | ----------- | ------------------------------------------------ |
| Node                                                                       | 24 or later | runs the CLI and loads the TS config             |
| TypeScript                                                                 | 7           | typechecks the report                            |
| Git                                                                        | any         | the build runs only inside a git repo            |
| Power BI Desktop                                                           | on Windows  | opens the report and runs the `desktop` commands |
| [Power BI modeling MCP](https://github.com/microsoft/powerbi-modeling-mcp) | optional    | live model work: DAX queries, measures, refresh  |

## What it does

- **Author:** write pages, visuals, bookmarks, themes and resources as typed modules. Each module follows the exact Microsoft schema version it targets.
- **Check:** catch bad names, broken links, unknown fonts, bad colors and model setup errors before Desktop opens the report.
- **Build:** `pbirkit build` writes the PBIP project. It keeps the edits that someone saved in Desktop and lists them for a port back to TS.
- **Import:** `pbirkit import` turns an existing PBIP project into a TS project that rebuilds the same JSON.
- **Inspect:** `pbirkit tree` prints the pages, visuals and bookmarks of a config or a PBIP folder.
- **Compare:** `pbirkit diff` compares the TS build with a PBIP folder, by JSON meaning or by exact bytes.
- **Look up:** `pbirkit visual` lists the roles, objects and properties of each built-in visual.
- **Drive Desktop (Windows):** `pbirkit desktop` opens, reloads and screenshots the report.

## Quick start

Most projects start from a report that already exists. Save it in Desktop as PBIP with the PBIR format, then:

```sh
npx pbirkit import path/to/Sales.pbip -o sales --idiomatic --cache
cd sales
git init
npm i -D typescript
npx pbirkit build
```

1. Read `IMPORT.md` in the new project. It lists the work that the import left for you.
2. Open the `.pbip` file in `dist/` with Desktop. `--cache` brings the data, so the report shows it at once. Without `--cache`, refresh the data in Desktop.
3. Change a visual in `src/`, then run `npx pbirkit build` again.
4. If you saved edits in Desktop, the build keeps them and lists them. Port each one into `src/`. To drop them, close Desktop without saving and run `npx pbirkit build --discard-desktop`.

## What the code looks like

`pbirkit.config.ts` describes the project:

```ts
import { defineConfig } from "pbirkit/config";
import { themeRef } from "pbirkit/resource";
import { SchemaUrl } from "pbirkit/schemas/schema-url";

import overview from "./src/pages/overview.ts";
import theme from "./src/theme.ts";

export default defineConfig({
	name: "Sales",
	pbip: { version: "1.0" },
	report: {
		logicalId: "21e73ab2-3245-4c3c-b660-2938a3372863",
		platform: { $schema: SchemaUrl.platform["2.0.0"], version: "2.0" },
		pbir: { version: "4.0" },
		definition: {
			$schema: SchemaUrl.report["3.3.0"],
			themeCollection: { customTheme: themeRef(theme, { visual: "2.13.0", report: "3.3.0", page: "2.1.0" }) },
		},
		version: { $schema: SchemaUrl.version["1.0.0"], version: "2.0.0" },
		pagesMetadata: { $schema: SchemaUrl.pages["1.0.0"], activePageName: overview.name },
		pages: [overview],
		resources: [theme],
	},
	model: {
		name: "Sales",
		path: "Sales.SemanticModel",
		logicalId: "23a4994e-a4e6-4870-b629-6a67a548fe0c",
		platform: { $schema: SchemaUrl.platform["2.0.0"], version: "2.0" },
		pbism: { version: "4.2" },
		definition: new URL("./model/", import.meta.url),
	},
});
```

`src/pages/overview.ts` holds a page with one visual:

```ts
import { measure, project, role } from "pbirkit/expr";
import { definePage } from "pbirkit/schemas/page/2.1.0";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

const revenue = defineVisual({
	name: "revenue-card",
	position: { x: 20, y: 20, z: 0, width: 240, height: 120 },
	visual: {
		visualType: "card",
		query: { queryState: { Values: role(project(measure("Sales", "Revenue"))) } },
	},
});

export default definePage({
	name: "overview",
	displayName: "Overview",
	displayOption: "FitToPage",
	visuals: [revenue],
});
```

`tsc` catches what Desktop would skip without a word: keys and values that the imported schema version does not allow, and typos in visual types, roles, objects and properties.

## Data Modelling

pbirkit builds the report and keeps the model as plain TMDL files. It does not type the model.
For live model work, add Microsoft's [Power BI modeling MCP server](https://github.com/microsoft/powerbi-modeling-mcp)
to your agent. The agent can then run DAX, edit measures and tables, and refresh data in the open Desktop.

Without the server, the agent edits the TMDL files by hand. See [docs/model.md](docs/model.md) for the full setup.

## Example project

[`examples/`](examples) holds a full Northwind Traders report with 15 pages. It shows shared builders for charts, cards and slicers, a layout grid, a custom theme and a typed field list from the model.

## Docs

Start at [docs/README.md](docs/README.md). An installed project has the same docs at `node_modules/pbirkit/docs/README.md`.

## Credits and license

- The schemas follow Microsoft's [Power BI JSON schemas](https://github.com/microsoft/json-schemas), under the MIT license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- pbirkit has no tie to Microsoft, and Microsoft does not endorse it. Power BI is a trademark of Microsoft.
- pbirkit uses the [MIT license](LICENSE).
