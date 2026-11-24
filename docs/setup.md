# Setup

Read this when you set up a machine or a new project for pbirkit.

## Tools

| Tool             | Version            | Why                                               |
| ---------------- | ------------------ | ------------------------------------------------- |
| Node             | 24 or later        | runs the CLI, and loads `pbirkit.config.ts` as TS |
| npm or pnpm      | any recent         | installs the `pbirkit` package                    |
| TypeScript       | 7 (`tsc`)          | typechecks the report project                     |
| Git              | any recent         | the build refuses to run outside a git repo       |
| Power BI Desktop | recent, on Windows | to open the report and for the `desktop` commands |

## Install

pbirkit is one npm package, `pbirkit`. It holds the `pbirkit` command and every module that a report imports.

1. Install it in the folder of the report project, or in the root of your repo:
   ```sh
   npm i -D pbirkit typescript
   ```
   With pnpm, run `pnpm add -D pbirkit typescript`.
2. Check the command:
   ```sh
   npx pbirkit --version
   ```
3. Import modules from `pbirkit/*`, for example `pbirkit/config`, `pbirkit/expr` and `pbirkit/schemas/visual/2.11.0`.

To try pbirkit without an install, run `npx --package pbirkit pbirkit import ...`. The typecheck still works, because the command points `.pbirkit/tsconfig.json` at the copy that npx downloaded.

The package also holds these docs, at `node_modules/pbirkit/docs/`. An agent in an installed project can start at `node_modules/pbirkit/docs/README.md`.

## One tsconfig per project

`Register` is one global interface. Each project adds its own fonts and custom visuals to it.

- Give each report project its own `tsconfig.json` that includes only that project's files.
- Typecheck each project on its own, for example with `npx tsc --noEmit -p my-report`.
- Do not use one tsconfig that includes several projects. Their `Register` entries clash there.

Each pbirkit command writes `.pbirkit/tsconfig.json`, and the project's `tsconfig.json` extends it. Git ignores the file. After a fresh clone, run any pbirkit command once, so that the file exists.

## Compiler options

pbirkit ships its types as TS source. `tsc` checks that source with the options of your project.

- Start from the `tsconfig.json` that `pbirkit import` writes. It sets every option that pbirkit needs.
- Keep `allowImportingTsExtensions` on. The pbirkit source imports its own files by their `.ts` names.
- Keep `noEmit` on. The CLI loads the TS files itself, so a report project needs no JS output.
- Set `moduleResolution` to `NodeNext` or `Bundler`.
- Install `@types/node` to use `process` or `node:*` modules in the config. TS 7 loads no global types by default. When `@types/node` resolves from the project folder, pbirkit adds `"types": ["node"]` to `.pbirkit/tsconfig.json`. A `types` list in your own `tsconfig.json` replaces it.
- `.pbirkit/tsconfig.json` turns on `erasableSyntaxOnly` and `verbatimModuleSyntax`. Node loads the config by stripping the TS types, so it rejects `enum`, `namespace`, parameter properties and type imports without `import type`. These options make `tsc` report each one before the build fails.
- You can add these stricter options: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` and `isolatedModules`.

## Windows and WSL

- You can work in WSL, but the `desktop` commands only run from Windows Node.
- Do not share `node_modules` between WSL and Windows.
- Builds on the WSL disk run much faster than builds on `/mnt/c`.
