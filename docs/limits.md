# Limits

Read this when a task seems to need something that pbirkit may not do yet.

## Not supported yet

| Gap                                           | Workaround                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| No field name check against TMDL              | read the TMDL; check in Desktop                                                     |
| No typed model (tables, measures in TS)       | edit TMDL files directly, or use the modeling MCP                                   |
| No `mobile.json` in config or build           | add it through `report.files`                                                       |
| One report per config                         | use one config per report; several reports can share a model through `byConnection` |
| No incremental build or watch mode            | rerun `pbirkit build`                                                               |
| No Desktop save, data refresh or live DAX     | ask the person, or use the modeling MCP                                             |
| Theme changes need a Desktop reopen           | `desktop open` again                                                                |
| No catalog typecheck of property values       | read the build warnings; `pbirkit visual TYPE OBJECT` lists enum values             |
| The catalog lists names, not Desktop behavior | test the setting in Desktop                                                         |

## Known rough edges

- **Desktop save mid-build:** a Desktop save between the build's last check and its write can get lost.
- **Case-only renames:** a rename that changes only letter case is not handled.
- **Two builds at once:** two builds of one project at the same time can clash. Run one at a time.
- **Model folder rename:** after a rename, the saved data cache no longer matches the model. Refresh the data in Desktop.
- **Same-name imports:** two imported projects with the same name clash in one tsconfig. Keep one tsconfig per project.
