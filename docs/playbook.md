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

1. Run `pbirkit build`. The build keeps the Desktop edits in `dist/` and prints the files under "port to src".
2. For each listed file, compare it with the TS module that owns it. `git diff dist/` shows the change, if `dist/` is in git.
3. Change the TS so it produces the same JSON.
4. Run `pbirkit build` again. A ported file drops off the list.
5. Run `pbirkit diff --bytes` for a strict check of the whole project.

Find the TS module for a visual with `pbirkit tree`. The id in the tree is the `name` field of the module.

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
