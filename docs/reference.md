# Reference

Look up a command, a config field, a module, an error or a limit here. The other pages explain when to use each one.

## Contents

- [CLI](#cli)
  - [build](#build)
  - [import](#import)
  - [diff](#diff)
  - [tree](#tree)
  - [visual](#visual)
  - [desktop](#desktop)
- [Config](#config)
  - [Top level](#top-level)
  - [report](#report)
  - [model](#model)
  - [Files](#files)
- [Modules](#modules)
- [Errors and warnings](#errors-and-warnings)
  - [Config load](#config-load)
  - [Check errors](#check-errors)
  - [Check warnings](#check-warnings)
  - [Build messages](#build-messages)
- [Limits](#limits)
  - [Not supported yet](#not-supported-yet)
  - [Rough edges](#rough-edges)
  - [Future plans](#future-plans)

## CLI

Paths in flags are relative to the folder where you run the command. `-c` defaults to `pbirkit.config.ts` in that folder.

### build

```sh
pbirkit build [-c FILE] [-o DIR] [--prefer src|desktop | --discard-desktop]
```

Builds the PBIP project into the config's `out` folder and merges it with Desktop saves. See [workflow.md](workflow.md#build).

| Flag                | Does                                                  |
| ------------------- | ----------------------------------------------------- |
| `-o DIR`            | writes a scratch build to `DIR`                       |
| `--prefer src`      | src wins where src and Desktop changed the same lines |
| `--prefer desktop`  | Desktop wins on those lines                           |
| `--discard-desktop` | throws away every Desktop change                      |

Exit codes: `0` built, `1` error.

### import

```sh
pbirkit import [SOURCE] [-o DIR] [--force] [--idiomatic] [--grouped] [--cache]
```

Turns a PBIP project folder or `.pbip` file into a TS project. See [workflow.md](workflow.md#import-a-report).

| Flag          | Does                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `-o DIR`      | the folder for the new project                                                                                                          |
| `--force`     | replaces the files that an earlier import wrote. It never touches other files.                                                          |
| `--idiomatic` | recommended. Writes `pbirkit/expr` helpers where they rebuild the same JSON.                                                            |
| `--grouped`   | writes one module per visual under `src/pages/<page>/visuals/`, with groups as folders. Without it, each page module holds its visuals. |
| `--cache`     | copies the data cache to `model/.pbi/cache.abf` and sets `model.cache`, so the first build has data                                     |

### diff

```sh
pbirkit diff [-c FILE] [--target DIR] [--bytes] [--warnings]
             [--page NAME]... [--visual NAME|PAGE/NAME]... [--bookmark NAME]... [--theme NAME]...
```

Builds the config in memory and compares it with a PBIP folder. `--target` defaults to the config's `out`.

- The default mode compares JSON meaning. It ignores key order, whitespace, CRLF and BOM. It keeps array order.
- `--bytes` compares exact bytes, line ends and BOM included.
- The selectors repeat and add up. `--visual PAGE/NAME` picks one visual when two pages share a name.
- `--warnings` also prints the config check warnings.
- The command skips Desktop-owned files and files outside the project.

Exit codes: `0` no difference, `1` differences, `2` error.

### tree

```sh
pbirkit tree [-c FILE]
pbirkit tree --pbip DIR_OR_PBIP
```

Prints the pages, visuals, groups and bookmarks, one per line:

```
<type> (<subtype>, <id>, <name>)
```

- `id` is the name in the PBIP files. Config fields and links use it.
- Marks: `-> <page>`, `[hidden]`, `[raw]`, `[no such page]`, `[saved on <page>, does not switch page]`.

The command skips the config checks, so it works on a project that fails `build`.

### visual

```sh
pbirkit visual
pbirkit visual TYPE [OBJECT] [--json]
pbirkit visual container [OBJECT] [--json]
```

Looks up the built-in visuals in Microsoft's visual catalog.

- With no argument, it lists the visual types.
- With a type, it lists the query roles, the objects and the states of each object.
- With an object, it lists each property, its Format pane name and its kind. An enum lists its values.
- `container` stands for the objects that every visual frame shares (`visualContainerObjects`).
- `--json` prints the catalog entry as it is.

Exit codes: `0` found, `2` unknown type or object.

### desktop

See [workflow.md](workflow.md#see-the-report-in-desktop) for what each command does, and for its limits.

```sh
pbirkit desktop status [-c FILE]
pbirkit desktop open   [-c FILE] [--wait SECONDS]
pbirkit desktop reload [-c FILE] [--model]
pbirkit desktop shot   [-c FILE] [PAGES...] [--scale 1-3] [--dir DIR]
```

## Config

The config default-exports `defineConfig({...})` from `pbirkit/config`. The build derives what the tree already fixes: folder names, page order, `byPath` and the `.pbip` artifact list.

Many fields take a typed object or a `URL` to a JSON file. The build copies a URL file as it is.

### Top level

| Field    | Type                   | Output                                              |
| -------- | ---------------------- | --------------------------------------------------- |
| `name`   | string                 | `<name>.pbip` and the `<name>.Report` folder        |
| `out`    | string, default `dist` | where `pbirkit build` writes                        |
| `pbip`   | object or URL          | `.pbip`, without `artifacts`, which the build fills |
| `report` | object                 | the `.Report` folder                                |
| `model`  | object, optional       | the `.SemanticModel` folder                         |

### report

| Field                              | Output or meaning                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `path`, `displayName`, `logicalId` | the folder name, display name and stable id in `.platform`                    |
| `platform`                         | `.platform`. Without it, set `logicalId`.                                     |
| `pbir`                             | `definition.pbir`. Set `datasetReference.byConnection` for a live connection. |
| `definition`                       | `definition/report.json`                                                      |
| `version`                          | `definition/version.json`                                                     |
| `pagesMetadata`                    | `definition/pages/pages.json`.                                                |
| `pages`                            | one `page.json` per page, and one `visual.json` per visual                    |
| `bookmarks`                        | `bookmarks/bookmarks.json` and one `*.bookmark.json` per bookmark             |
| `resources`                        | `StaticResources/`, `CustomVisuals/` and `resourcePackages` in `report.json`  |
| `fonts`                            | the custom font names that the report uses                                    |
| `extensions`                       | `reportExtensions.json`                                                       |
| `semanticModelDiagramLayout`       | the diagram layout file on the report side                                    |
| `files`                            | extra files, as `{ "path": URL \| string }`. See [Files](#files).             |
| `desktopOwned`                     | paths where Desktop always wins. The build never lists them for a port.       |

### model

| Field                                        | Output or meaning                                      |
| -------------------------------------------- | ------------------------------------------------------ |
| `name`, `path`, `logicalId`                  | the model name, folder name and stable id              |
| `platform`, `pbism`                          | `.platform` and `definition.pbism`                     |
| `definition`                                 | a URL to the TMDL folder, copied to `definition/`      |
| `editorSettings`                             | `.pbi/editorSettings.json`                             |
| `diagramLayout`, `daxQueries`, `tmdlScripts` | `diagramLayout.json`, `DAXQueries/` and `TMDLScripts/` |
| `unappliedChanges`                           | `.pbi/unappliedChanges.json`                           |
| `cache`                                      | a seed for `.pbi/cache.abf`, Desktop's data cache      |
| `modelReference`                             | `modelReference.json`, for Analysis Services models    |
| `files`, `desktopOwned`                      | the same as on `report`                                |

Set exactly one of `model` and `report.pbir.datasetReference.byConnection`. The check fails on both, and on neither.

### Files

- A `files` key is a path inside the report or model folder. The value is a `URL`, or a string with the file text.
- A key that ends in `/` maps a folder, and it takes a `URL`.
- The build copies folders through `git check-ignore`, so git-ignored files stay out. It always skips `.git`.
- JSON and TMDL files get CRLF line ends, text entries too. DAX and binary files stay as they are.
- A single-file entry replaces the same file from a copied folder. Two single files at one path fail the build.

## Modules

| Import                             | Holds                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `pbirkit/config`                   | `defineConfig`                                                                     |
| `pbirkit/schemas/<kind>/<version>` | `definePage`, `defineVisual`, `defineBookmark` and the types of one schema version |
| `pbirkit/schemas/theme/<version>`  | the custom theme types                                                             |
| `pbirkit/expr`                     | the expression helpers. See [expressions.md](expressions.md).                      |
| `pbirkit/resource`                 | `customTheme`, `baseTheme`, `builtInTheme`, `image`, `themeRef`                    |
| `pbirkit/custom-visual`            | `customVisual`, for AppSource, organization and `.pbiviz` visuals                  |
| `pbirkit/font`                     | `font`, the built-in font faces, and the size scale from 8 to 60                   |
| `pbirkit/register`                 | the `Register` interface, for names that a Desktop-saved report uses               |
| `pbirkit/visual-catalog`           | `objectsFor`, `rolesFor`, `CheckedObjects`, `CheckedRoles` and catalog lookups     |
| `pbirkit/visual-type`              | the list of built-in visual types                                                  |
| `pbirkit/check`                    | `checkConfig`, the checks that `build` runs                                        |
| `pbirkit/build`                    | `buildFiles`, the build without the merge                                          |
| `pbirkit/tree`                     | `indexReport`, the data behind `pbirkit tree`                                      |

The kinds of `pbirkit/schemas` and their versions:

| Kind       | Versions        |
| ---------- | --------------- |
| `report`   | 1.0.0 to 3.3.0  |
| `page`     | 1.0.0 to 2.1.0  |
| `visual`   | 1.0.0 to 2.13.0 |
| `bookmark` | 1.0.0 to 2.1.0  |
| `mobile`   | 1.0.0 to 2.8.0  |

## Errors and warnings

An `[ERROR]` line stops the build, and the build writes nothing. A `[WARN]` line does not stop it. Read every warning: most of them mark a setting that Desktop ignores without a word.

### Config load

| Message                                                    | Fix                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `cannot load ...` with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` | Rewrite each `enum`, `namespace` and parameter property as plain code. See [workflow.md](workflow.md#typescript-config). |
| `... is not a valid config`                                | The default export does not match the config shape. Read the detail lines.                                               |
| `... is not inside a git repository`                       | Run `git init` in the project folder.                                                                                    |

### Check errors

| Message says                                                                                    | Fix                                                                              |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `name "..." ...`, `must be a plain file name`                                                   | Use letters, digits, `_` and `-`. Names become file and folder names.            |
| `... is used more than once`                                                                    | Give each page, visual on a page, bookmark and `pageBinding` its own name.       |
| `is not a page`, `is not a visual on page`, `is not a group on this page`                       | Fix the link, or add the missing page, visual or group.                          |
| `must be a file: URL`                                                                           | Use `new URL("./file", import.meta.url)`.                                        |
| `a folder path takes a file: URL, not text`                                                     | Give a folder entry in `files` a `URL`.                                          |
| `desktopOwned "...": path must be a relative path`                                              | Write the path inside the folder, with `/`.                                      |
| `... is listed in desktopOwned, so remove it from the source`                                   | Drop the file from `files`, or from the `desktopOwned` list.                     |
| `report: set logicalId, or keep platform as a file`                                             | Set `report.logicalId`, or set `report.platform` to a URL.                       |
| `model: set name and logicalId, or keep platform as a file`                                     | Set `model.name` and `model.logicalId`, or set `model.platform` to a URL.        |
| `use either model or ...byConnection, not both`, `set model for a local semantic model, or ...` | Keep exactly one of the two.                                                     |
| `font "..." is not a Power BI font`                                                             | Add the family to `report.fonts` and to the `Register`, or pick a built-in font. |
| `pbiviz guid ... does not match`                                                                | Use the `.pbiviz` file that the custom visual names.                             |

### Check warnings

| Message says                                                                                  | Fix                                                                                                      |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `takes an integer, so write long(N)`                                                          | Write `long(N)`. Desktop ignores a double there.                                                         |
| `"..." is not a TYPE object`                                                                  | Run `pbirkit visual TYPE` and fix the object name.                                                       |
| `visualType "..." is not a Power BI visual or a custom visual listed in the report`           | Fix the type, or add the custom visual to `report.resources`. `pbirkit visual` lists the built-in types. |
| `visualLink ... is not a bookmark` or `a visual`                                              | Fix the link target.                                                                                     |
| `value is a field, but the selector has no dataViewWildcard with matchingOption 0`            | Use `wildcard(field, 0)` in the card reference label selector.                                           |
| `show is set only in entries with a selector`                                                 | Set `show` in an entry with no selector.                                                                 |
| `level "..." is not a field`, `levels are not in the same order`, `the tree is N levels deep` | Make the expansion state match the fields of the visual.                                                 |

### Build messages

| Message                                                  | Means and fix                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[WARN] build: Desktop changes not in src yet`           | Desktop saved changes that src lacks. The build kept them. Port each one. See [workflow.md](workflow.md#port-desktop-edits).                      |
| `[WARN] build: Desktop removed N parts of the model`     | A Desktop save dropped model parts that src still has. The build kept the Desktop version. Check them with `pbirkit diff`.                        |
| `[ERROR] build: N files in dist can't be merged`         | src and Desktop changed the same lines. Run the `git diff` command that the message prints, then build with `--prefer src` or `--prefer desktop`. |
| `... changed while the build ran`                        | A file changed during the build. Save in Desktop, then build again.                                                                               |
| `... holds files whose names differ only in letter case` | Rename one of them. Windows cannot hold both.                                                                                                     |
| `cannot throw away the Desktop changes`                  | The build cannot tell whether Desktop has the project open. Close Desktop, then build again.                                                      |

## Limits

### Not supported yet

| Gap                                         | Workaround                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| No `mobile.json` in the config or the build | Add it through `report.files`.                                                   |
| One report per config                       | Give each report its own folder. See [workflow.md](workflow.md#several-reports). |
| No watch mode, and no partial build         | Run `pbirkit build` again.                                                       |

### Rough edges

- **A Desktop save during a build** can get lost if it lands after the last check and before the write.
- **A rename that changes only letter case** is not handled.
- **Two builds of one project at once** can clash. Run one at a time.
- **A renamed model folder** no longer matches the saved data cache. Refresh the data in Desktop.

### Future plans

- Check field names against the TMDL files.
- Higher-level helpers for bookmarks.
