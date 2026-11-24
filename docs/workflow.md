# Workflow

Read this when you set up a project, import a report, build, work with Power BI Desktop, or port edits that a person made in Desktop.

## Contents

- [Setup](#setup)
  - [TypeScript config](#typescript-config)
  - [Several reports](#several-reports)
- [Import a report](#import-a-report)
- [Data cache](#data-cache)
- [Build](#build)
- [See the report in Desktop](#see-the-report-in-desktop)
- [Work beside the person](#work-beside-the-person)
- [Port Desktop edits](#port-desktop-edits)
  - [Get the exact JSON for a setting](#get-the-exact-json-for-a-setting)
  - [Settle a conflict](#settle-a-conflict)
  - [Throw away Desktop edits](#throw-away-desktop-edits)
  - [Paths that Desktop owns](#paths-that-desktop-owns)
- [Add a page](#add-a-page)

## Setup

The main README lists the [requirements](../README.md#requirements) and the [install](../README.md#install) command.

### TypeScript config

- **One `tsconfig.json` per project.** `Register` is one global interface, and each project adds its own fonts and visuals to it. Two projects in one tsconfig clash.
- **Extend `.pbirkit/tsconfig.json`.** Each pbirkit command writes this file, and git ignores it. After a fresh clone, run any pbirkit command once to create it.
- **Write the `extends` value exactly as `"./.pbirkit/tsconfig.json"`**, in a `tsconfig.json` next to the config. pbirkit writes the file only when it finds that value. Another form, such as `".pbirkit/tsconfig.json"`, leaves the file out of date.
- **Start from the `tsconfig.json` that `pbirkit import` writes.** It sets the options that pbirkit needs.
- **Node loads the config by stripping its types.** So `enum`, `namespace`, parameter properties and type imports without `import type` fail at load. `.pbirkit/tsconfig.json` turns on `erasableSyntaxOnly` and `verbatimModuleSyntax`, so `tsc` reports each one first.
- **Install `@types/node`** to use `process` or `node:*` modules. pbirkit then adds `"types": ["node"]` to `.pbirkit/tsconfig.json`.

### Several reports

`pbirkit.config.ts` is the entry point of one report, and each config builds one report. Every command takes `-c` to point at another config file.

To keep several reports in one repo, give each report its own folder, with its own config and `tsconfig.json`:

```
reports/
  sales/      pbirkit.config.ts, tsconfig.json, src/, model/
  finance/    pbirkit.config.ts, tsconfig.json, src/, model/
```

Build each one with `pbirkit build -c reports/sales/pbirkit.config.ts`, or from inside its folder.

Do not put two configs in one folder, even with different `out` folders. They share `.pbirkit/` next to the config:

- Each build keeps only its own snapshot and deletes the others. The next build of the other config has no snapshot, so it treats each Desktop change as a conflict.
- Both builds back up the data cache to one file, so one report can get the other's data.

Reports can share one published model through `report.pbir.datasetReference.byConnection`.

## Import a report

Most projects start from a report that already exists. Save it in Desktop as PBIP with the PBIR format, then:

```sh
pbirkit import path/to/Sales.pbip -o sales --idiomatic --cache
```

`--idiomatic` is recommended. It writes `pbirkit/expr` helpers in place of raw JSON. `--cache` brings the data, see [Data cache](#data-cache). [reference.md](reference.md#import) lists every flag.

After it writes the files, the import builds the new project in memory and compares it with the source. It writes the output even when that check fails, so you can fix the rest by hand.

What the import writes:

```
sales/
  pbirkit.config.ts        the config
  package.json             "type": "module", the #/ and #static/ aliases, pbirkit
  tsconfig.json            extends .pbirkit/tsconfig.json
  IMPORT.md                work left for you: read this first
  AGENTS.md                points agents at the pbirkit docs, written only when missing
  .pbirkit-import.json     the files the import wrote, for --force
  src/
    pages/index.ts         the page list, in report order
    pages/<page>/index.ts  each page with its visuals
    bookmarks/             the bookmark list and one module per bookmark
    themes/<name>.ts       each theme as TS
    resources.ts           named images
    ids.ts                 readable names for generated ids, when needed
    palette.ts             named colors (--idiomatic)
  model/                   the TMDL files, as they are
  model/.pbi/cache.abf     the data cache (--cache), git-ignored
  static/                  static resources, custom visuals, other raw files
```

Then:

1. Run `npm i -D typescript` in the new project. The new `package.json` already lists pbirkit, so npm installs both.
2. Run `git init` if the project is not inside a git repo yet.
3. Read `IMPORT.md`. It lists the files that stayed raw, duplicate visuals that could share a builder, shared bookmark filters, and Desktop leftovers. Delete it when the work is done.
4. Check that the TS rebuilds the source: `pbirkit diff --target path/to/source-folder`. Exit code 0 means no difference.
5. Refactor in small steps, such as shared builders and better names.

A file that the import cannot type, or cannot rebuild exactly, stays raw. A raw file still builds to the same bytes. `pbirkit tree` marks it `[raw]`.

## Data cache

Desktop keeps the data in `<model folder>/.pbi/cache.abf`. Without it, the report opens with no data.

- **`pbirkit import --cache`** copies the cache to `model/.pbi/cache.abf`, sets `model.cache`, and adds the copy to `.gitignore`. The first build then seeds `dist/` with the data. If the source has no cache, the import says so and imports the rest.
- **Without `--cache`,** refresh the data in Desktop after you open the report.

`model.cache` seeds every fresh `dist/` with the same data. The build never deletes the cache. It keeps a backup in `.pbirkit/`, and it restores the cache from there if `dist/` disappears. A scratch build with `--out` does not restore it.

## Build

```sh
pbirkit build
```

1. The build loads the config and checks it against the schemas. Unknown keys fail.
2. It runs the config checks. Errors stop the build. Warnings print, and the build goes on.
3. It builds every file in memory, in Desktop's exact format.
4. It merges the result into `dist/`, file by file.
5. It writes the changes, records a snapshot, and prints the files that Desktop changed.

The build keeps a snapshot of its last output. For each file it compares the snapshot, the new build and the file in `dist/`:

| src changed | Desktop changed  | Result                                         |
| ----------- | ---------------- | ---------------------------------------------- |
| yes         | no               | the build writes the new file                  |
| no          | yes              | the build keeps the Desktop file and lists it  |
| yes         | yes, other lines | a line merge keeps both changes                |
| yes         | yes, same lines  | a conflict: the build writes nothing and stops |

- **The list goes to stderr.** It sits under a `[WARN] build:` line, with one path per line after it. Keep stderr when you capture the output.
- **Reformat-only changes get a count, not a list.** Desktop sometimes only moves keys or changes whitespace. The build counts such files on stdout. They need no port.
- **The first build over a `dist/` that pbirkit did not write** has no snapshot. Each file that differs counts as a conflict, and the build asks for `--prefer`.
- **Lost model parts.** A Desktop save can drop parts of the model without an error, such as the ordinals and the partition of a calculation group. The build then warns about model parts that `src` has and `dist/` lacks. The check reads TMDL lines, not the full grammar, so run `pbirkit diff` after a save that touched the model.
- **A scratch build** writes a full build to another folder and leaves `dist/` alone: `pbirkit build --out scratch`. It skips the merge and the snapshot. Use it to compare variants, such as two themes.
- **`.pbirkit/`** holds the snapshot, the cache backup and the screenshots. Git ignores it. Do not edit it.

## See the report in Desktop

The `desktop` commands talk to Desktop through Microsoft's Desktop bridge. They run on Windows only.

| Command                                           | Does                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `desktop status`                                  | lists the Desktop windows, the one with this project, and its unsaved state |
| `desktop open [--wait 180]`                       | opens the built `.pbip` and waits until the bridge reaches it               |
| `desktop reload [--model]`                        | makes Desktop read the build again. `--model` also reloads the model.       |
| `desktop shot [PAGES...] [--scale 2] [--dir DIR]` | saves pages as PNG, by default in `.pbirkit/shots`                          |

- The commands look for `PBIDesktop.exe` in the usual install folders and in the Microsoft Store folder. For another install, set `PBI_DESKTOP_PATH` to the full path of `PBIDesktop.exe`.
- `shot` takes page names from the config, and captures every page when you list none. Look at the PNGs after each shot.
- Rough times: an open takes 30 to 60 s, a reload about 3 s, a shot 1 to 3 s per page.

Limits of the bridge and of Desktop:

- **A reload can lose unsaved work.** Desktop does not always report unsaved edits, so the command warns but does not block. Ask the person to save first.
- **A reload skips themes.** Close Desktop and run `desktop open` again.
- **Desktop stays busy after a model change.** It can answer "Host is not ready". The reload then tries again each second for up to 30 s.
- **The first shot after an open, a reload or a model change can come back blank or half drawn.** Take it again before you look for a cause.
- **A shot shows the screen as it is.** Zoom, the filter pane and the selection frame of a selected visual all show. The selection frame can look like clipping. A shot also uses the saved filter and slicer state.
- **A shot shows the resting state only.** It cannot show hover, pressed or tooltip states.
- **A shot can leave Desktop zoomed into a canvas-only view.** This comes from the Desktop bridge. A reopen fixes it.
- **One window per project.** The commands stop when two Desktop windows have the same project open.

## Work beside the person

Desktop is shared state. The person may have their own work open in it.

- **Reload, do not close.** A reload of their window is fine. Ask before you close it, because a close loses their unsaved work and any data refresh.
- **Ask for what the bridge cannot do:** save, close with "Don't save", refresh the data, edit the canvas, hover, press, or look at another filter state. The modeling MCP server can refresh the data and run DAX.
- **Ask the person to add an AppSource or custom visual.** They add it in Desktop, put one on a page, and save. The save brings the visual's GUID, its package and a `visual.json` to port from. See [Port Desktop edits](#port-desktop-edits).
- **"Unsaved changes" on open is normal**, even for an untouched project.
- **A hung `PBIDesktop` process with no window** blocks `open` and `reload`. Ask the person to end it in Task Manager → Details.
- **A refresh can hang behind a hidden dialog.** Ask the person to click Refresh instead of retrying.
- **Keep experiments out of `dist/`.** An edit that you make by hand in `dist/` counts as a Desktop edit. Use a scratch build instead.

## Port Desktop edits

Port each Desktop save into TS before it drifts.

1. Run `pbirkit build`. Read the "Desktop changes not in src yet" list and any lost model parts.
2. Run `pbirkit diff`. For each changed file, it prints the JSON paths that differ, with the build value and the `dist/` value. Narrow it with `--page`, `--visual`, `--bookmark` or `--theme`.
3. Handle each file as the table says.
4. Run `pbirkit build` again. A ported file drops off the list.
5. Optional: run `pbirkit diff --bytes` for a strict check of the whole project. A byte difference with no JSON difference needs no port.

| What `pbirkit diff` shows                          | What to do                                                                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nothing for a listed file                          | Desktop only moved keys or changed whitespace. Nothing to port.                                                                                             |
| a few paths in one visual, page or bookmark        | Change the TS module so it builds the same values. `pbirkit tree` gives the module: its id is the `name` in the module.                                     |
| `/$schema` with a new version                      | Desktop raised the version when it saved the file. Change the `$schema` and the `pbirkit/schemas/...` import to the new version, then port the other paths. |
| many paths, or a new visual, page or bookmark      | Import the saved project into a scratch folder with `pbirkit import dist -o scratch`, and copy the module you need.                                         |
| a new group, and children with smaller `x` and `y` | The person grouped visuals. Add the group in TS, as [authoring.md](authoring.md#groups) shows. Give it a readable `name` and `displayName`.                 |
| a model file (`.tmdl`, `diagramLayout.json`)       | Copy the file from `dist/` over the source file. If the build warned about lost model parts, throw the change away.                                         |
| an added file                                      | Map it in `model.files` or `report.files`, or list it in `desktopOwned` if Desktop always writes it.                                                        |

### Get the exact JSON for a setting

First look up the setting with `pbirkit visual TYPE OBJECT`, and test it. Ask the person only when you get stuck, for example after a setting fails twice. They set it in the Format pane and save. Then `pbirkit diff` shows the exact paths and values to port.

### Settle a conflict

Pick a side for the files in conflict:

- Keep TS: `pbirkit build --prefer src`
- Keep Desktop: `pbirkit build --prefer desktop`, then port the change into TS.

`--prefer` settles only the conflicts. It leaves the clean merges alone.

### Throw away Desktop edits

Port what you want to keep first. Then close Desktop without saving and run:

```sh
pbirkit build --discard-desktop
```

- The build writes every file from `src` and lists each Desktop change that it threw away.
- It deletes the files that Desktop added inside the `.pbip` file, the report folder and the model folder.
- It keeps the data cache, `localSettings.json` and the paths in `desktopOwned`.
- On Windows, it stops when Desktop has the project open.

Do not delete `dist/` to reset. A delete loses the local settings.

### Paths that Desktop owns

List paths in `report.desktopOwned` or `model.desktopOwned` when Desktop always wins and you never port them. The build keeps those paths and leaves them off the list.

```ts
model: {
	desktopOwned: ["diagramLayout.json", "DAXQueries/"],
},
```

- Each path is relative to the report or model folder. A path that ends in `/` covers the whole folder.
- Good fits are files that Desktop rewrites on most saves, such as the model diagram layout, and folders of the person's own DAX queries or TMDL scripts.
- A path in `desktopOwned` must not also come from the source, so drop its config field or its `files` entry.

## Add a page

1. Create `src/pages/<page>/index.ts` with `definePage` from the page version that the report uses. See [authoring.md](authoring.md#a-page).
2. Add the page to `src/pages/index.ts`.
3. Run `pbirkit build`, then `pbirkit desktop reload` and `pbirkit desktop shot <page>`.
