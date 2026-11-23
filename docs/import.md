# Import

Read this when you turn an existing PBIP project into a pbirkit TS project.

```sh
pbirkit import [SOURCE] [-o DIR] [--force] [--idiomatic] [--grouped]
```

- `SOURCE`: a PBIP project folder or a `.pbip` file.
- `-o DIR`: output folder for the new project.
- `--force`: replace the files that an earlier import wrote. It never touches files that the import did not write (see `.pbirkit-import.json`).
- `--idiomatic`: write helper calls like `col`, `measure`, `solid` and `filterOn`. Each call appears only where it rebuilds the exact same JSON. The output shrinks to about a fifth of the plain lines.
- `--grouped`: write one module per visual under `src/pages/<page>/visuals/`, with groups as folders. Without it, each page module holds its visuals.

After it writes the files, the import builds the new project in memory and compares it with the source. It writes the output even when that check fails, so that you can fix the rest by hand.

The new `package.json` lists `pbirkit` as a dev dependency. Run `npm i -D typescript` in the new project, so that npm installs both. If the folder already has a `package.json`, the import adds only the aliases to it.

## Output layout

```
my-report/
  pbirkit.config.ts        the config: report, model, resources
  package.json             "type": "module", the #/ and #static/ aliases, pbirkit
  tsconfig.json            extends .pbirkit/tsconfig.json
  IMPORT.md                work left for agents (read this first)
  .pbirkit-import.json     list of generated files, for --force
  src/
    pages/index.ts         page list, in report order
    pages/<page>/index.ts  definePage, with the visuals of the page
    pages/<page>/visuals/  one module per visual (--grouped); groups become folders, two levels deep at most
    bookmarks/index.ts     bookmark list
    bookmarks/<name>.ts    defineBookmark
    themes/<name>.ts       theme JSON as TS
    resources.ts           named images
    ids.ts                 readable constants for generated ids, when needed
    palette.ts             named colors (--idiomatic)
  model/                   TMDL and model files, copied as they are
  static/                  StaticResources, CustomVisuals, other raw files
```

File names come from the visual title, then the first field, then the Desktop id. Names use kebab-case and stop at 64 characters.

## Links between modules

Modules import each other where that leads to no cycle:

- with `--grouped`, a group child imports its group and uses `group.name`
- with `--grouped`, page interactions import their visuals
- bookmarks import their pages, and their visuals with `--grouped`
- the config's `activePageName` uses `page.name`

Where an import would make a cycle, the module uses a string id from `ids.ts`.

Without `--grouped`, a visual has no module of its own. Links to it use its name, or the matching id from `ids.ts`.

## Raw fallback

The import types each file as far as it can. A file that it cannot type, or cannot rebuild exactly, stays raw. Examples: an unknown schema version, a renamed folder, a broken group parent. A raw file still builds to the same bytes. `pbirkit tree` marks such items `[raw]`, and `IMPORT.md` lists them.

## IMPORT.md

`IMPORT.md` lists:

- files that the import kept raw, and why
- groups of duplicate or near-duplicate visuals, each a candidate for one shared builder
- bookmark filter states that several bookmarks share
- Desktop leftovers and `queryRef` mismatches

No tool reads `IMPORT.md` back. Delete it when the work is done.
