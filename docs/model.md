# Model

Read this when you change the semantic model or use the Power BI modeling MCP server.

pbirkit builds the report from TS. It keeps the model as plain TMDL files and copies them into `dist/` as they are. It does not type the model. The `model` part of the config maps to the `.SemanticModel` folder. See [reference.md](reference.md#model) for its fields.

## Contents

- [Model rules](#model-rules)
- [The modeling MCP server](#the-modeling-mcp-server)
  - [Setup](#setup)
  - [Connect](#connect)
  - [Keep the changes](#keep-the-changes)

## Model rules

- **Advise against Auto date/time.** It adds a hidden `LocalDateTable_*` table for each date column. Recommend that the person turn it off in Desktop and use one date table instead.
- **Do not delete a `LocalDateTable_*` table by hand.** Visuals use these tables through `.Variation.Date Hierarchy`, so a deleted table breaks them. Move those visuals to the date table first, then turn off Auto date/time.
- **Row-level security:** write the roles as TMDL, or create them through the MCP server. Only the person can publish the model and assign members to the roles.

## The modeling MCP server

Microsoft's [Power BI modeling MCP server](https://github.com/microsoft/powerbi-modeling-mcp) gives an agent live access to the model. Use it next to pbirkit to run DAX queries, edit measures and tables, and refresh data.

### Setup

Add the server to your agent's MCP config:

```sh
npx -y @microsoft/powerbi-modeling-mcp@latest --start --accept-eula
```

Some harnesses read the MCP config from a `.mcp.json` file at the project root:

```json
{
	"mcpServers": {
		"powerbi-modeling": {
			"command": "npx",
			"args": ["-y", "@microsoft/powerbi-modeling-mcp@latest", "--start", "--accept-eula"]
		}
	}
}
```

- `--accept-eula` accepts Microsoft's license terms. Ask the person before you set it.
- Some agents load a new MCP server only after a session restart.

### Connect

| Connection                      | Can do                                        | Cannot do |
| ------------------------------- | --------------------------------------------- | --------- |
| live, to an open Desktop window | DAX queries, model edits, validation, refresh |           |
| offline, to a PBIP folder       | load and validate the TMDL files              | run DAX   |

- Open the report with `pbirkit desktop open`, then connect the server to that window.
- Desktop's port changes after each reload or reopen. Look it up again before you reconnect.
- An offline rename does not update the DAX that refers to the old name.

### Keep the changes

The server changes the model in Desktop's memory, not in your files. The files change only when the person saves in Desktop. The save writes the model into `dist/`.

1. Ask the person to save in Desktop.
2. Run `pbirkit build`. It keeps the model changes and lists them.
3. Port each changed model file, as [workflow.md](workflow.md#port-desktop-edits) shows.

A reload or a reopen before the save loses the change.
