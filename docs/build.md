# Build

Read this when you need to know what `pbirkit build` does to `dist/`, or why it stopped.

```sh
pbirkit build [-c CONFIG] [--out DIR] [--prefer src|desktop | --discard-desktop]
```

## What it does

1. Loads the config and checks it against the schemas. Unknown keys fail.
2. Runs `checkConfig`. Errors stop the build. Warnings print, and the build goes on.
3. Builds every file in memory. Number text, key order, CRLF line ends and the missing final newline all match Desktop.
4. Merges the new build into `out` (default `dist`), file by file.
5. Writes the changes, records a snapshot, and prints the files that Desktop changed.

## The merge

The build keeps a snapshot of its last output. For each file it compares three versions: the snapshot, the new build and the file in `dist/`.

| src changed | Desktop changed  | Result                                                                               |
| ----------- | ---------------- | ------------------------------------------------------------------------------------ |
| yes         | no               | the build writes the new file                                                        |
| no          | yes              | the build keeps the Desktop file and lists it under "Desktop changes not in src yet" |
| yes         | yes, other lines | a line merge keeps both changes                                                      |
| yes         | yes, same lines  | a conflict: the build writes nothing and stops                                       |

`--prefer src` or `--prefer desktop` settles a conflict. It does not touch the Desktop changes that merge cleanly. A Desktop deletion counts as a change.

The list of Desktop changes puts the real changes first. A file that Desktop only reformatted gets one line with a count: its JSON keys moved, or its whitespace or line endings changed. Such a file needs no port.

The first build over a `dist/` that pbirkit did not write has no snapshot to compare with. Each file that differs from the new build then counts as a conflict, and the build asks for `--prefer`.

## Lost model parts

A Desktop save can drop part of the model, such as the ordinals and the partition of a calculation group, and Desktop shows no error. The merge keeps such a change like any other. The build then prints a `[WARN] build:` list of the model parts that src has and `dist/` lacks.

- The check reads the object lines of each TMDL file (`table`, `column`, `measure`, `partition`, `calculationItem`, `ref` and others) and the `ordinal` property.
- A part that moved to another file does not count as lost.
- The check reads lines, not the full TMDL grammar, so it can miss a loss. Run `pbirkit diff` after a Desktop save that touched the model.

## Throw away Desktop changes

To go back to the build, close Desktop without saving and run:

```sh
pbirkit build --discard-desktop
```

- The build writes every file from src and lists each Desktop change that it threw away.
- It deletes the files that Desktop added inside the `.pbip` file, the report folder and the model folder. It keeps other files in `dist/`.
- It keeps the data cache, `localSettings.json` and the paths in `desktopOwned`.
- On Windows, it stops when the bridge finds a Desktop window with the project open, or a window that does not answer. The bridge can't see every Desktop window, so close Desktop first anyway. On other systems it can't check Desktop, so it prints a reminder.
- It stops when a file that it would change or delete leads through a link to a place outside `dist/`.

`--discard-desktop` and `--prefer` do not go together.

## The .pbirkit folder

`.pbirkit/` holds the build snapshot, a copy of Desktop's data cache and the screenshots of `desktop shot`. Git ignores it. Do not edit or delete it by hand.

## Data cache

Desktop keeps imported data in `.pbi/cache.abf`. The build never deletes it. If `dist/` disappears, the build restores the cache from `.pbirkit/`. When model files change, the build prints a note to refresh the data in Desktop.

## Scratch builds

`--out DIR` writes a full build to `DIR`. It skips the merge and leaves the build record alone. The build rejects a `DIR` inside `.pbirkit/` or at the config folder.

## Desktop-owned paths

List paths in `report.desktopOwned` or `model.desktopOwned` when Desktop always wins and you never port them. The culture file is the usual case. The build keeps those paths and leaves them off the "Desktop changes not in src yet" list.

## Exit codes

- `0`: the build finished.
- `1`: an error or a conflict occurred. Each message starts with `[ERROR] <tag>:`.
