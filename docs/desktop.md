# Desktop

Read this when you want to open, reload or screenshot the report in Power BI Desktop from the command line.

The `desktop` commands talk to Power BI Desktop through Microsoft's Desktop bridge. The bridge runs on Windows only, so run these commands from Windows Node. A Node process in WSL cannot reach it.

## Commands

| Command                                           | Does                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `desktop status`                                  | lists the Desktop windows that the bridge reaches, the one with this project, and its unsaved state |
| `desktop open [--wait 180]`                       | opens the built `.pbip` and waits until the bridge reaches it                                       |
| `desktop reload [--model]`                        | makes Desktop read the build again; `--model` also reloads the model definition                     |
| `desktop shot [PAGES...] [--scale 2] [--dir DIR]` | saves pages as PNG, default folder `.pbirkit/shots`                                                 |

`shot` takes page names from the config. It captures every page when you list none. One failed page does not stop the rest, but the exit code turns 1.

## Limits

- **Reload can lose work:** a reload can drop unsaved Desktop edits. Desktop does not always report unsaved edits, so the command warns but does not block. Ask the person to save first.
- **Themes need a reopen:** a reload skips theme files. Close Desktop and run `desktop open` again.
- **Screenshots match the screen:** a screenshot shows the canvas as it looks now, zoom, clip and filter pane included.
- **The bridge does not reach everything:** it cannot save, close, refresh data, edit the canvas or run DAX.
- **Rough times:** an open takes 30–60 s, a reload about 3 s, and a shot 1–3 s per page.

## Model work

For live model work (DAX queries, measures, refresh), use Microsoft's Power BI modeling MCP server beside pbirkit. pbirkit does not wrap it yet.
