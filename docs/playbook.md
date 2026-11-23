# Playbook

Read this when you need a recipe for a common job. Each recipe lists the commands in order.

## Migrate an existing report to TS

1. Make sure the report is saved as PBIP with the PBIR format.
2. Import it:
   ```sh
   pbirkit import "path/to/Report.pbip" -o my-report --idiomatic
   ```
3. Read `my-report/IMPORT.md`. It lists raw files, duplicate visuals and other work left for you.
4. Check that the TS rebuilds the source:
   ```sh
   pbirkit diff -c my-report/pbirkit.config.ts --target "path/to/project-folder"
   ```
   Exit code 0 means no difference.
5. Typecheck the new project with `npx tsc --noEmit -p my-report`.
6. Refactor in small steps: shared builders for duplicate visuals, better names. Run `pbirkit diff` after each step.

## Port edits that a person made in Desktop

1. Run `pbirkit build`. The build keeps the Desktop edits in `dist/` and lists the files under "Desktop changes not in src yet". It counts the files that Desktop only reformatted on a separate line, and it warns about model parts that Desktop removed.
2. Run `pbirkit diff`. For each changed file, it prints the JSON paths that differ, with the value from the build and the value in `dist/`. Narrow it with `--page`, `--visual`, `--bookmark` or `--theme`.
3. Sort each listed file into one of the cases below.
4. Run `pbirkit build` again. A ported file drops off the list.
5. Run `pbirkit diff --bytes` for a strict check of the whole project.

| What `pbirkit diff` shows                                                 | What to do                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nothing for a listed file                                                 | Desktop only reordered keys or changed whitespace. Nothing to port. Keep the file, or throw the change away (see below).                                                                                                                                |
| a few paths in one visual, page or bookmark                               | Change the TS module so it builds the same values. `pbirkit tree` gives the module: its id is the `name` in the module.                                                                                                                                 |
| `/$schema` with a new version                                             | Desktop raised the version when it saved the file. Change the `$schema` and the `pbirkit/schemas/...` import in the module to the new version, then port the other paths.                                                                               |
| many paths, or a new visual or page                                       | Import the saved project into a scratch folder with `pbirkit import dist -o <scratch folder>` and copy the visual or module you need. An unknown schema version stays raw there, and a raw module still builds.                                         |
| a new group, and children with `/parentGroupName` and smaller `x` and `y` | The person grouped visuals in Desktop. Add the group in TS, and keep each child's position relative to its group (see [authoring.md](authoring.md#groups)). Give the group a readable `name` and `displayName` in place of the random id and "Group 1". |
| a model file (`.tmdl`, `diagramLayout.json`)                              | The model is plain files. Copy the file from `dist/` over the source file that the config points to. If the build warned about lost model parts, throw the change away instead (see below).                                                             |
| an added file                                                             | Map it in `model.files` or `report.files`, or list it in `desktopOwned` if Desktop always writes it.                                                                                                                                                    |

To throw away every Desktop change instead, close Desktop without saving and run `pbirkit build --discard-desktop` (see [build.md](build.md#throw-away-desktop-changes)). Port the changes you want to keep first.

## Add a page

1. Create `src/pages/<page>/index.ts` with `definePage` from the page version the report uses (see [authoring.md](authoring.md)).
2. Add visual modules under `src/pages/<page>/visuals/`, and list them in the page.
3. Add the page to `src/pages/index.ts`. The order of this list is the page order in the report.
4. Run `pbirkit build`, then `pbirkit desktop reload` and `pbirkit desktop shot <page>` to see it.

## Look at the report without Desktop open

```sh
pbirkit tree                 # structure from the config
pbirkit tree --pbip dist     # structure from the PBIP files
```

## See the report as Desktop shows it (Windows)

```sh
pbirkit build
pbirkit desktop open
pbirkit desktop shot --scale 2      # writes PNGs to .pbirkit/shots
```

After the next change, run `pbirkit build` and then `pbirkit desktop reload`. A theme change needs a fresh `desktop open`.

## Settle a conflict

The build stops and writes nothing when TS and Desktop changed the same lines of a file.

- Keep TS: `pbirkit build --prefer src`
- Keep Desktop: `pbirkit build --prefer desktop`, then port the change to TS.

## Try a change without touching dist

```sh
pbirkit build --out scratch
```

A scratch build skips the snapshot and the merge, and it leaves the build record alone.
