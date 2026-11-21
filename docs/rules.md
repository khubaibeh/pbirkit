# Rules

Read this before you change a report. Each rule comes from a real break.

## Model

- Keep every `LocalDateTable_*` table and its relationships. Removal breaks the report: many visuals use `.Variation.Date Hierarchy`. To drop them, turn off Auto date/time in Desktop instead.
- Without a culture file (`cultures/en-US.tmdl`), Desktop writes a small one on save, with `ref cultureInfo en-US` in `model.tmdl`. List the culture folder in `desktopOwned` if you do not want it in src.
- pbirkit does not check field names. `col("Sales", "Amount")` accepts any string, so check the names against the TMDL yourself.
- After a model change, refresh the data in Desktop.

## Names

- Page, visual, bookmark and group names use `[A-Za-z0-9_-]` and stay within 50 characters.
- Page names are unique in the report. Visual names are unique on their page. `pageBinding.name` is unique in the report.
- Folder names match object names. Desktop accepts a renamed folder, and import keeps such a file raw.
- Bookmark filter names stay as Desktop wrote them (random 20-character ids).

## Values

- Colors: `#` plus 6 hex digits.
- Fonts: built-in names, Desktop font stacks or registered families. No quotes or semicolons in other forms.
- Font sizes: whole numbers 8–60.
- Keep long decimals like `153.00003051757813` as they are. Rounding changes the bytes.

## Files

- Never edit `.pbi/localSettings.json` or `.pbi/cache.abf`.
- Never build over a `dist/` that Desktop saved before you looked at its changes. The merge keeps the changes, but read the "port to src" list first.
- Desktop raises a file's schema version when it saves that file. Port the new `$schema` along with the change.

## Work style for agents

- Run `pbirkit diff` after each refactor step.
- Prefer `pbirkit tree` to raw JSON reads when you need the structure.
- Keep one tsconfig per report project.
