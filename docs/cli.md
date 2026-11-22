# CLI

Read this when you need the exact commands and flags. `pbirkit <command> --help` prints the same facts for the version that you installed.

In a project that installs pbirkit, run each command as `npx pbirkit ...` or `pnpm exec pbirkit ...`.

Paths in flags are relative to the folder where you run the command. `-c` defaults to `pbirkit.config.ts` in that folder.

## build

```sh
pbirkit build [-c FILE] [-o DIR] [--prefer src|desktop]
```

Builds the PBIP project and merges it with Desktop edits. See [build.md](build.md).

## import

```sh
pbirkit import [SOURCE] [-o DIR] [--force] [--idiomatic]
```

Turns a PBIP project into a TS project. See [import.md](import.md).

## diff

```sh
pbirkit diff [-c FILE] [--target DIR] [--bytes] [--warnings]
             [--page NAME]... [--visual NAME|PAGE/NAME]... [--bookmark NAME]... [--theme NAME]...
```

Builds the config in memory and compares it with a PBIP folder. `--target` defaults to the config's `out`.

- The default mode compares JSON meaning. It ignores key order, whitespace, CRLF and BOM, and it keeps array order.
- `--bytes` compares exact bytes, line ends and BOM included.
- The selectors repeat, and they add up. `--visual PAGE/NAME` picks one visual when two pages share a name.
- `--warnings` also prints `checkConfig` warnings.
- The command skips Desktop-owned files and files outside the project.

Exit codes: `0` no difference, `1` differences, `2` error.

## tree

```sh
pbirkit tree [-c FILE]
pbirkit tree --pbip DIR_OR_PBIP
```

Prints pages, visuals and bookmarks. Each line has this form:

```
<type> (<subtype>, <id>, <name>)
```

- `type`: page, visual, group or bookmark
- `id`: the name in the PBIP files; config fields and links use it
- marks: `-> <page>`, `[hidden]`, `[raw]`, `[no such page]`, `[saved on <page>, does not switch page]`

The command skips the report checks, so it works on a project that fails `build`.

## visual

```sh
pbirkit visual
pbirkit visual TYPE [OBJECT] [--json]
pbirkit visual container [OBJECT] [--json]
```

Looks up the formatting objects of the built-in visuals in Microsoft's visual catalog (`@microsoft/powerbi-core-visual-schema`).

- With no argument, it lists the visual types.
- With a type, it lists the query roles, the objects and the states of each object.
- With an object, it lists each property, its name in the Format pane and its kind. An enum kind lists the values that the property takes.
- `container` stands for the objects that every visual frame shares (`visualContainerObjects`).
- `--json` prints the catalog entry as it is.

Exit codes: `0` found, `2` unknown type or object.

## desktop

Windows only. See [desktop.md](desktop.md).

```sh
pbirkit desktop status [-c FILE]
pbirkit desktop open   [-c FILE] [--wait SECONDS]
pbirkit desktop reload [-c FILE] [--model]
pbirkit desktop shot   [-c FILE] [PAGES...] [--scale 1-3] [--dir DIR]
```
