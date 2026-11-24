# pbirkit docs

Start here. This page maps each task to a page, explains how pbirkit works, and lists the rules for agents.

`pbirkit <command> --help` gives the exact flags of the installed version. If a page here disagrees with the help, the help wins.

The rules and advice in these docs are defaults. When the person's direction or the project's own agent instructions conflict with them, follow the person. Facts about how pbirkit and Desktop behave still hold.

## Contents

- [Pages](#pages)
- [How it works](#how-it-works)
- [After a change](#after-a-change)
- [Rules for agents](#rules-for-agents)
- [Before you hand back](#before-you-hand-back)

## Pages

| Page                             | Read it when you...                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| [workflow.md](workflow.md)       | set up a project, import a report, build, work with Desktop, or port edits from Desktop |
| [authoring.md](authoring.md)     | write pages, visuals, groups, bookmarks, themes, fonts or shared builders               |
| [expressions.md](expressions.md) | write a field, a value, a format setting, a selector, a condition or a filter           |
| [model.md](model.md)             | change the semantic model or use the modeling MCP server                                |
| [reference.md](reference.md)     | look up a command, a config field, a module, an error or a limit                        |

## How it works

- **TS is the source of truth.** You write the report as typed modules under `src/`. `pbirkit build` turns them into a PBIP project in `dist/`.
- **The build matches what Desktop writes.** It writes number text, key order, line ends and file names as Desktop does. Most files match byte for byte. Some match only in JSON meaning, so `pbirkit diff` compares by meaning by default.
- **Desktop saves into `dist/`.** When a person saves in Desktop, the changes land in `dist/`, not in `src/`. The next build keeps them and lists them. You then port each one into `src/`.
- **Each file follows one schema version.** Every PBIR file has a `$schema` URL. In TS you import the module of that exact version, such as `pbirkit/schemas/visual/2.13.0`. The types then reject keys and values that this version does not allow.
- **The model stays as TMDL files.** pbirkit copies the model folder as it is.

## After a change

What Desktop needs after each kind of change:

| You changed                      | Do this                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| pages, visuals or bookmarks      | `pbirkit build`, then `pbirkit desktop reload`                                        |
| a theme                          | `pbirkit build`. Ask the person to close Desktop, then run `pbirkit desktop open`.    |
| model TMDL files                 | `pbirkit build`, then `pbirkit desktop reload --model`. Then refresh the data.        |
| the model through the MCP server | Ask the person to save in Desktop, then `pbirkit build`, and port each model file     |
| nothing, but Desktop saved       | `pbirkit build`, read the "Desktop changes not in src yet" list, and port each change |

## Rules for agents

- **Use the helpers.** Write fields, values and selectors with `pbirkit/expr`, not as raw JSON. See [expressions.md](expressions.md).
- **Look up names first.** Run `pbirkit visual TYPE OBJECT` before you write an object, a property or an enum value.
- **Read the structure with `pbirkit tree`**, not with raw JSON reads.
- **Check each step.** Run `pbirkit diff` after each refactor step, and read every build warning.
- **Fix names, do not register them.** See [authoring.md](authoring.md#register).
- **Test every state.** Check a conditional setting with blank, positive and negative values before you call it done.
- **Test a shared change on one page.** When you change a shared builder or the theme, build and look at one page that uses it.
- **Leave the person's Desktop alone.** See [workflow.md](workflow.md#work-beside-the-person).
- **Say what you did not check.** Name each state that a screenshot cannot show, and ask the person to check it.
- **Never edit `.pbi/localSettings.json` or `.pbi/cache.abf`.**

## Before you hand back

- [ ] The project typecheck and `pbirkit build` pass, with no new build warnings.
- [ ] `pbirkit diff` shows only the changes you meant.
- [ ] You looked at one screenshot of a page that uses each changed part.
- [ ] You told the person what you could not check.
- [ ] You told the person which Desktop windows are open, and whether you reloaded theirs.
