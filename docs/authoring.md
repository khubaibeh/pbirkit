# Authoring

Read this when you write or change pages, visuals, groups, bookmarks, themes, fonts or shared builders.

For fields, values and selectors, see [expressions.md](expressions.md).

## Contents

- [Versioned modules](#versioned-modules)
- [A page](#a-page)
- [A visual](#a-visual)
- [Register](#register)
- [Groups](#groups)
- [Selection pane names](#selection-pane-names)
- [Bookmarks](#bookmarks)
- [Shared builders](#shared-builders)
- [Themes and resources](#themes-and-resources)
  - [Custom themes](#custom-themes)
  - [Base and built-in themes](#base-and-built-in-themes)
  - [Fonts](#fonts)
- [Key order](#key-order)
- [Visual traps](#visual-traps)

## Versioned modules

Each PBIR file kind has one module per Microsoft schema version. Import the one that matches the file's `$schema`:

```ts
import { defineBookmark } from "pbirkit/schemas/bookmark/2.1.0";
import { definePage } from "pbirkit/schemas/page/2.1.0";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";
```

The `define*` helper fills in `$schema`. Files in one report can use different versions. [reference.md](reference.md#modules) lists the versions of each kind.

`SchemaUrl` from `pbirkit/schemas/schema-url` holds every `$schema` URL, such as `SchemaUrl.report["3.3.0"]`.

## A page

```ts
import { definePage } from "pbirkit/schemas/page/2.1.0";

import revenue from "./visuals/revenue-card.ts";

export default definePage({
	name: "overview",
	displayName: "Overview",
	displayOption: "FitToPage",
	width: 1280,
	height: 720,
	visuals: [revenue],
});
```

- The order of `src/pages/index.ts` sets the page order.
- `pagesMetadata.activePageName` in the config sets the page that opens first. Use `overview.name`, not a copied string.

## A visual

```ts
import { measure, obj, project, role } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

export default defineVisual({
	name: "revenue-card",
	position: { x: 20, y: 20, z: 1000, width: 240, height: 120, tabOrder: 1000 },
	visual: {
		visualType: "cardVisual",
		query: { queryState: { Data: role(project(measure("Sales", "Revenue"))) } },
		visualContainerObjects: {
			title: obj({ show: true, text: "Revenue" }),
		},
	},
});
```

- **`name`** is the visual's id and folder name. It must be unique on the page, use only `[A-Za-z0-9_-]`, and stay within 50 characters.
- **`z`** sets the stack order among visuals with the same parent.
- **`visualType`** takes a built-in type or a custom visual that you registered. A typo fails the typecheck.
- **Objects, properties and roles** must exist in Microsoft's visual catalog for that `visualType`. A typo fails the typecheck, and the error names the `pbirkit visual` command that lists the valid names.

The typecheck does not cover property values or `visualContainerObjects`. The build checks part of them and prints warnings: enum values, integer values, selector state ids, and the number of fields per role.

## Register

`Register` from `pbirkit/register` holds types for the whole project: custom visual types, custom fonts, and catalog names that Desktop knows but the catalog lacks. Add to it with module augmentation:

```ts
declare module "pbirkit/register" {
	interface Register {
		readonly visualObjects: { readonly cardVisual: { readonly overflow: "type" } };
		readonly visualRoles: { readonly cardVisual: "NewRole" };
	}
}
```

- `visualObjects` maps a visual type to its extra objects, and each object to a union of property names. Use `never` for an object with no properties.
- `visualRoles` maps a visual type to a union of extra role names.
- `pbirkit import` writes both keys for names in the report that the catalog lacks.

Add a name only when a report that Desktop saved uses it. Desktop ignores a name that it does not know, so never add one to clear a type error. Fix the name instead.

## Groups

A group is a visual with `visualGroup` in place of `visual`. Each child points at it with `parentGroupName`:

```ts
import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

const header = defineVisual({
	name: "header",
	position: { x: 272, y: 20, z: 1000, width: 1040, height: 92, tabOrder: 1000 },
	visualGroup: {
		displayName: "Header",
		groupMode: "ScaleMode",
	},
});

const title = defineVisual({
	name: "header-title",
	parentGroupName: header.name,
	position: { x: 0, y: 22, z: 1000, width: 1040, height: 46, tabOrder: 2000 },
	visual: { visualType: "textbox" },
});
```

- **Child positions count from the group's top left corner**, not the page's. Here the title draws at 272, 42 on the page. A child at page positions draws too far right and down, and neither Desktop nor the build reports it.
- **In a nested group**, a child counts from its closest group.
- **The group's `position`** is the box around its direct children.
- **Each group has its own `z` order** for its children. `tabOrder` stays one order for the whole page.
- **The selection pane** shows the group's `displayName`.

A shared builder can stay free of group props. Build the children at page positions, then pass them to one helper. The helper adds the group, sets `parentGroupName` on each direct child, and subtracts the group's corner from each one.

## Selection pane names

The selection pane names a visual by its title text, even when the title is hidden. A visual with no title text shows its type, such as "Text box". To name it without a visible title, set the text and hide the title:

```ts
visualContainerObjects: {
	title: obj({ show: false, text: "Page title" }),
},
```

`pbirkit tree` prints the same name.

## Bookmarks

Bookmarks refer to pages and visuals by their `name`. Import the module and use its value, not a copied string:

```ts
explorationState: {
	activeSection: overview.name; /* ... */
}
```

Bookmark filter names stay as Desktop wrote them: random 20-character ids. For the filter and expansion state helpers, see [expressions.md](expressions.md#links-and-bookmarks).

Bookmarks have no higher-level helpers yet. Ask the person to create a complex bookmark in Desktop, then port it:

1. Ask the person to save in Desktop.
2. Run `pbirkit import dist -o scratch`.
3. Copy the bookmark module from `scratch/src/bookmarks/`, and add it to your bookmark list.
4. Run `pbirkit build`. The new bookmark file drops off the list of Desktop changes.

## Shared builders

A shared builder makes many visuals from one function, such as a KPI strip or a chart helper. It must keep the literal types, or the catalog typecheck turns off without a word.

`defineVisual<Type, Objects, QueryState>` infers its three type parameters from the call: `Type` from `visualType`, `Objects` from `objects`, `QueryState` from `query.queryState`. Never pass them by hand. TS has no partial inference, so `defineVisual<"cardVisual">(...)` fails.

These forms keep the check:

1. **One `defineVisual` call per visual type, with a literal `visualType`.** The simplest form. Most builders need nothing else.
2. **A wrapper with the full input type.** The builder takes what `defineVisual` takes and adds its own fields:
   ```ts
   import { defineVisual } from "pbirkit/schemas/visual/2.13.0";

   type Input<T extends string, O, S> = Parameters<typeof defineVisual<T, O, S>>[0];

   export const card = <const T extends string, const O, const S>(input: Input<T, O, S>) =>
   	defineVisual(input);
   ```
3. **A check at the call site** with `objectsFor` and `rolesFor` from `pbirkit/visual-catalog`:
   ```ts
   const objects = objectsFor("clusteredBarChart")({ legend: obj({ show: true }) });
   const roles = rolesFor("clusteredBarChart")({ Y: role(project(measure("Sales", "Revenue"))) });
   ```
4. **A generic builder** with `CheckedObjects` and `CheckedRoles` on its parameters:
   ```ts
   import type { Visual } from "pbirkit/schemas/visual/2.13.0";
   import type { CatalogVisual, CheckedObjects, CheckedRoles } from "pbirkit/visual-catalog";

   type Config = Extract<Visual, { readonly visual: unknown }>["visual"];

   export const chart = <
   	const Type extends CatalogVisual,
   	const Objects extends NonNullable<Config["objects"]>,
   	const QueryState extends NonNullable<Config["query"]>["queryState"],
   >(input: {
   	readonly type: Type;
   	readonly objects: CheckedObjects<Type, Objects>;
   	readonly roles: CheckedRoles<Type, QueryState>;
   }) => defineVisual({/* ... */});
   ```

These forms turn the check off:

- a `visualType` typed as `string`, `VisualType` or a union of types
- `objects` or `queryState` typed as a record, such as `Record<string, unknown>`
- `(visual: Parameters<typeof defineVisual>[0]) => defineVisual(visual)`, without the type parameters

After you change a builder, prove the check still runs. Add a typo to a property name and to a role name, run the typecheck, see it fail, then remove the typos. The build warnings still catch a name that escapes the typecheck.

## Themes and resources

List themes, images and custom visuals in `report.resources`. The build writes each file to `StaticResources/` or `CustomVisuals/`, and fills in `resourcePackages` in `report.json`.

| Kind           | Helper                                                        | Notes                                                           |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| base theme     | `baseTheme({ name, theme })`                                  | Desktop's base theme, in `SharedResources/BaseThemes`           |
| built-in theme | `builtInTheme({ name, theme })`                               | a Desktop built-in theme in the custom theme slot               |
| custom theme   | `customTheme({ name, theme })`                                | your own theme, in `RegisteredResources`                        |
| image          | `image({ name, file: new URL(...) })`                         | copied as bytes                                                 |
| custom visual  | `customVisual({ guid, source })` from `pbirkit/custom-visual` | `source` is `appSource`, `file` (a `.pbiviz`) or `organization` |

The theme helpers come from `pbirkit/resource`. Link a theme into the report with `themeRef(theme, reportVersion)` in `themeCollection`. For an image, see `imageRef` in [expressions.md](expressions.md#links-and-bookmarks).

### Custom themes

- **Write the theme as a TS module** with `defineTheme` from `pbirkit/schemas/theme`. It types the top level and all 64 options of Desktop's Customize theme dialog. `visualStyles` per visual type stays loose. A JSON import widens colors to `string` and loses the checks.
- **Colors:** `#` plus exactly 6 hex digits. Fill colors inside `visualStyles` also take 8 hex digits or a theme color name, such as `"background"`.
- **Fonts and font sizes** follow the rules in [Fonts](#fonts).

Desktop rejects custom themes that break these rules, so pbirkit checks them before the build.

### Base and built-in themes

`baseTheme` and `builtInTheme` take one of Desktop's own themes. Write it with `defineDesktopTheme` from `pbirkit/schemas/theme`. It types the known keys, allows Desktop's fractional font sizes such as `10.5`, and keeps other keys as they are. `pbirkit import` writes each base and built-in theme this way.

pbirkit does not ship Desktop's themes. To get one, run `pbirkit import` on a project that uses it. A report with no base theme still opens, but it loses the defaults of the Fluent base theme.

### Fonts

- A font is a built-in name, a Desktop font stack, or a custom family that you registered.
- A font size is a whole number from 8 to 60.
- A custom family needs an entry in `report.fonts` and in `Register`.
- The font check rejects quoted names and ad hoc comma lists.

## Key order

The build writes keys in the order that the TS object lists them. Keep the order of the JSON when you port a change, or `pbirkit diff --bytes` reports a difference.

## Visual traps

Desktop shows no error for a wrong or misplaced setting. The visual just looks the same. The build warns about these cases:

- **Card reference label value:** a `referenceLabel` entry in a `cardVisual` that sets `value` to a field needs `wildcard(field, 0)` in its selector, next to `id` and `metadata`. Without it, the card shows the `showBlankAs` text.
- **Button `show`:** in an `actionButton`, set `show` for `text`, `icon`, `fill` and `outline` in an entry with no selector. Desktop ignores a `show` that sits only in a state entry.
