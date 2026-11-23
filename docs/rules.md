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

## Visual settings

These rules come from Desktop's behavior, not from Microsoft's visual catalog. Desktop shows no error when you break them, but `pbirkit build` prints a warning for each rule below.

- A `cardVisual` `referenceLabel` entry that sets `value` to a field needs `data: [{ dataViewWildcard: { matchingOption: 0 } }]` in its selector, next to `id` and `metadata`. Without it, the label draws but the value stays empty, and the card shows the `showBlankAs` text. `wildcard(field, 0)` from `pbirkit/expr` builds that selector.
- In an `actionButton`, put `show` for `text`, `icon`, `fill` and `outline` in an entry with no selector. Desktop ignores a `show` that only appears in a state entry such as `{ id: "default" }`. Other button-like visuals may follow the same rule, but the build checks only `actionButton`. Test the others in Desktop.

## Groups

- A group child's `x` and `y` count from its group's top left corner, not the page's. Desktop shows no error for a child at page positions. It draws the child in the wrong place, and the build does not warn. See [authoring.md](authoring.md#groups).

## Files

- Never edit `.pbi/localSettings.json` or `.pbi/cache.abf`.
- Never build over a `dist/` that Desktop saved before you looked at its changes. The merge keeps the changes, but read the "Desktop changes not in src yet" list and any lost model parts first. To throw the changes away, see [build.md](build.md#throw-away-desktop-changes).
- Desktop raises a file's schema version when it saves that file. Port the new `$schema` along with the change.

## Work style for agents

- Run `pbirkit diff` after each refactor step.
- Prefer `pbirkit tree` to raw JSON reads when you need the structure.
- Run `pbirkit visual TYPE OBJECT` before you guess a property name or an enum value.
- Never add a name to Register `visualObjects` or `visualRoles` to clear a type error. Add it only when a report that Desktop saved uses it. Otherwise fix the name.
- Test a conditional setting in every state, not only the default one. A setting that Desktop ignores looks the same as one that has nothing to show.
- Keep one tsconfig per report project.
