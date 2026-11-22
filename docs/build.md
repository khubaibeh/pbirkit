# Build

Read this when you need to know what `pbirkit build` does to `dist/`, or why it stopped.

```sh
pbirkit build [-c CONFIG] [--out DIR] [--prefer src|desktop]
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

`--prefer src` or `--prefer desktop` settles a conflict. A Desktop deletion counts as a change.

The first build over a `dist/` that pbirkit did not write has no snapshot to compare with. Each file that differs from the new build then counts as a conflict, and the build asks for `--prefer`.

## Throw away Desktop changes

A Desktop save can drop part of the model, such as the ordinals and the partition of a calculation group, and Desktop shows no error. The merge keeps such a change like any other. To go back to the build:

1. Close Desktop.
2. Delete `dist/`.
3. Run `pbirkit build`.

The build writes every file from src and restores the data cache from `.pbirkit/`. It cannot restore the files that only Desktop writes, such as `localSettings.json` and the paths in `desktopOwned`. Desktop writes them again on the next save.

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
