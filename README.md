# pbirkit

pbirkit lets you write Power BI reports in TypeScript. The build writes the PBIR files byte for byte as Power BI Desktop writes them. The model (TMDL) stays as plain files.

pbirkit puts agents first. An agent writes and changes the report in TS, and a person checks the result in Power BI Desktop.

> Status: experimental. APIs can change without notice.

## Agents: start here

1. Read [docs/README.md](docs/README.md). It maps each task to the page that covers it. In an installed project, the same docs live at `node_modules/pbirkit/docs/README.md`.
2. For a step-by-step recipe, read [docs/playbook.md](docs/playbook.md).
3. Run `npx pbirkit <command> --help` for the exact flags. The help text is the source of truth.

## Install

```sh
npm i -D pbirkit typescript
npx pbirkit --help
```

One package holds the `pbirkit` command and every module that a report imports, such as `pbirkit/config` and `pbirkit/visual/2.11.0`. See [docs/setup.md](docs/setup.md) for the details.

## What it does

- **Author:** you write pages, visuals, bookmarks, themes and resources as typed TS modules. Each module uses the schema of the exact Microsoft version it targets.
- **Check:** `checkConfig` catches bad names, broken links, unknown fonts, bad colors and model setup errors before Desktop sees them.
- **Build:** `pbirkit build` writes the PBIP project. It keeps edits that someone made in Desktop and lists them for a port back to TS.
- **Import:** `pbirkit import` turns an existing PBIP project into a TS project that rebuilds the same bytes.
- **Inspect:** `pbirkit tree` prints the pages, visuals and bookmarks of a config or a PBIP folder.
- **Compare:** `pbirkit diff` compares the TS build with a PBIP folder, by JSON meaning or by exact bytes.
- **Drive Desktop (Windows):** `pbirkit desktop` opens, reloads and screenshots the report through Microsoft's Desktop bridge.

## The loop

```
TS source ──pbirkit build──▶ dist/ (PBIP) ──open──▶ Power BI Desktop
    ▲                            │                        │
    └──── agent ports edits ◀── build lists edits ◀── user saves
```

1. The agent edits the TS source.
2. `pbirkit build` writes `dist/`.
3. A person opens `dist/` in Desktop, looks, edits and saves.
4. The next `pbirkit build` keeps the Desktop edits and lists them.
5. The agent ports each listed edit into TS.

## Quick example

```ts
// pbirkit.config.ts
import { defineConfig } from "pbirkit/config";
import { SchemaUrl } from "pbirkit/schema-url";

import pages from "#/pages/index.ts";

export default defineConfig({
	name: "Sales",
	pbip: { version: "1.0", settings: { enableAutoRecovery: true } },
	report: {
		platform: { $schema: SchemaUrl.platform["2.0.0"], version: "2.0" },
		pbir: { version: "4.0" },
		definition: new URL("./src/report.json", import.meta.url),
		version: { $schema: SchemaUrl.version["1.0.0"], version: "2.0.0" },
		pagesMetadata: { $schema: SchemaUrl.pages["1.0.0"] },
		pages,
	},
	model: {
		path: "Sales.SemanticModel",
		platform: { $schema: SchemaUrl.platform["2.0.0"], version: "2.0" },
		pbism: { version: "4.2", settings: {} },
		definition: new URL("./model/definition/", import.meta.url),
	},
});
```

Most projects start from `pbirkit import` and not from a blank file. See [docs/import.md](docs/import.md).

## Modules

| Import from                                                 | What it holds                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| `pbirkit/config`                                            | `defineConfig` and the config schema                            |
| `pbirkit/visual/<v>`, `pbirkit/page/<v>`, ...               | `define*` helpers for each schema version                       |
| `pbirkit/expr`                                              | expression helpers: `col`, `measure`, `solid`, `filterState`... |
| `pbirkit/resource`, `pbirkit/custom-visual`, `pbirkit/font` | images, custom visuals and fonts                                |
| `pbirkit/theme`, `pbirkit/themes/<name>`                    | `defineTheme` and typed Desktop default themes                  |
| `pbirkit/schema-url`                                        | every `$schema` URL                                             |
| `pbirkit/register`                                          | `Register`, for project-wide custom visuals and fonts           |
| `pbirkit/check`, `pbirkit/build`, `pbirkit/tree`            | `checkConfig`, the in-memory build, the report tree             |

## Requirements

- Node 24 or later
- Git: the build needs the project inside a git repo
- Windows with Power BI Desktop, for the `desktop` commands and for a look at the report

See [docs/setup.md](docs/setup.md).
