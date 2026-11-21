# pbirkit docs

Start here. Find your task in the table, then open that page. Each page starts with a "Read this when" line.

## Task map

| I want to...                                                                     | Read                             |
| -------------------------------------------------------------------------------- | -------------------------------- |
| Do a common job step by step (port a Desktop edit, add a page, migrate a report) | [playbook.md](playbook.md)       |
| Install pbirkit; set up Node, git and Windows                                    | [setup.md](setup.md)             |
| Turn an existing PBIP project into TS                                            | [import.md](import.md)           |
| Know what each config field does                                                 | [config.md](config.md)           |
| Write pages, visuals, bookmarks and themes                                       | [authoring.md](authoring.md)     |
| Shorten expressions with helpers (`col`, `measure`, `solid`...)                  | [expressions.md](expressions.md) |
| Add themes, images, custom visuals and fonts                                     | [resources.md](resources.md)     |
| Know how the build keeps Desktop edits                                           | [build.md](build.md)             |
| Compare TS with a PBIP folder                                                    | [cli.md#diff](cli.md#diff)       |
| Look at the report structure fast                                                | [cli.md#tree](cli.md#tree)       |
| Open, reload or screenshot the report in Desktop                                 | [desktop.md](desktop.md)         |
| Look up every command and flag                                                   | [cli.md](cli.md)                 |
| Avoid the known traps (date tables, culture files, fonts, names)                 | [rules.md](rules.md)             |
| Know what pbirkit cannot do yet                                                  | [limits.md](limits.md)           |

## Facts to keep in mind

- TS is the source of truth for the report. `dist/` is build output plus Desktop edits.
- The model (TMDL) stays as plain files. pbirkit copies it and does not check field names against it.
- Every PBIR file has a `$schema` URL. In TS you import the module of that exact version, for example `pbirkit/schemas/visual/2.11.0`.
- Run the command as `npx pbirkit` in a project that installs it.
- `pbirkit <command> --help` gives the exact flags. If a page here disagrees with the help, the help wins.
