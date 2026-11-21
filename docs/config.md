# Config

Read this when you need to know what a field in `pbirkit.config.ts` does.

The config default-exports `defineConfig({...})` from `pbirkit/config`. Each field maps to one or more files of the PBIP project. The build derives anything that the tree already fixes: folder names, page order, `byPath`, the `.pbip` artifact list.

Many fields take either a typed object or a `URL` to a JSON file. A URL copies that file as it is.

## Top level

| Field    | Type                   | Output                                               |
| -------- | ---------------------- | ---------------------------------------------------- |
| `name`   | string                 | `<name>.pbip` and the `<name>.Report` folder         |
| `out`    | string, default `dist` | where `pbirkit build` writes                         |
| `pbip`   | object or URL          | `.pbip` (without `artifacts`, which the build fills) |
| `report` | object                 | the `.Report` folder (below)                         |
| `model`  | object, optional       | the `.SemanticModel` folder (below)                  |

## report

| Field                              | Output or meaning                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `path`, `displayName`, `logicalId` | folder name, display name and the stable id in `.platform`                                                                   |
| `platform`                         | `.platform`                                                                                                                  |
| `pbir`                             | `definition.pbir`. Set `datasetReference.byConnection` for a live connection; leave it out and set `model` for a local model |
| `definition`                       | `definition/report.json`                                                                                                     |
| `version`                          | `definition/version.json`                                                                                                    |
| `pagesMetadata`                    | `definition/pages/pages.json`. The `pages` list sets `pageOrder`                                                             |
| `pages`                            | one `page.json` per page, and one `visual.json` per visual                                                                   |
| `bookmarks`                        | `bookmarks/bookmarks.json` and one `*.bookmark.json` per bookmark                                                            |
| `resources`                        | `StaticResources/`, `CustomVisuals/` and `resourcePackages` in `report.json` (see [resources.md](resources.md))              |
| `fonts`                            | custom font names the report uses                                                                                            |
| `extensions`                       | `reportExtensions.json`                                                                                                      |
| `semanticModelDiagramLayout`       | the report-side diagram layout file                                                                                          |
| `files`                            | extra raw files: `{ "relative/path": URL }`. A path that ends in `/` maps a folder                                           |
| `desktopOwned`                     | paths where Desktop always wins; the build never lists them for a port                                                       |

## model

| Field                                        | Output or meaning                                      |
| -------------------------------------------- | ------------------------------------------------------ |
| `name`, `path`, `logicalId`                  | model name, folder name and stable id                  |
| `platform`, `pbism`                          | `.platform` and `definition.pbism`                     |
| `definition`                                 | URL to the TMDL `definition/` folder, copied as it is  |
| `editorSettings`                             | `.pbi/editorSettings.json`                             |
| `diagramLayout`, `daxQueries`, `tmdlScripts` | `diagramLayout.json`, `DAXQueries/` and `TMDLScripts/` |
| `unappliedChanges`                           | `.pbi/unappliedChanges.json`                           |
| `cache`                                      | a seed for `.pbi/cache.abf` (Desktop's data cache)     |
| `modelReference`                             | `modelReference.json`, for Analysis Services models    |
| `files`, `desktopOwned`                      | same as on `report`                                    |

Set exactly one of `model` and `report.pbir.datasetReference.byConnection`. `checkConfig` reports an error for both or neither.

## Raw files and git ignore

The build copies folder URLs through `git check-ignore`, so ignored files stay out. It always skips `.git`. It turns JSON and TMDL line ends into CRLF, as Desktop writes them. It leaves DAX and binary files as they are.
