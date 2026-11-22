# Authoring

Read this when you write or change pages, visuals, bookmarks or themes in TS.

## Versioned modules

Each PBIR file kind has one module per Microsoft schema version. Import the one that matches the file's `$schema`:

```ts
import { defineBookmark } from "pbirkit/schemas/bookmark/2.0.0";
import { definePage } from "pbirkit/schemas/page/2.0.0";
import { defineReport } from "pbirkit/schemas/report/3.3.0";
import { defineVisual } from "pbirkit/schemas/visual/2.11.0";
```

The `define*` helper fills in `$schema`, and it rejects keys that the schema does not allow. Different files in one report can use different versions. When Desktop saves a file, it can raise that file's version (for example visual 2.5.0 to 2.11.0). Port that version raise with the rest of the change.

`SchemaUrl` from `pbirkit/schemas/schema-url` holds every URL, for example `SchemaUrl.report["3.3.0"]`.

| Kind               | Versions       |
| ------------------ | -------------- |
| report             | 1.0.0 – 3.3.0  |
| page               | 1.0.0 – 2.1.0  |
| visual (container) | 1.0.0 – 2.13.0 |
| mobile             | 1.0.0 – 2.8.0  |
| bookmark           | 1.0.0 – 2.1.0  |

## A visual

```ts
import { measure, obj, project, role } from "pbirkit/expr";
import { defineVisual } from "pbirkit/schemas/visual/2.11.0";

export default defineVisual({
	name: "revenue-card",
	position: { x: 20, y: 20, z: 1000, width: 240, height: 120, tabOrder: 1000 },
	visual: {
		visualType: "card",
		query: { queryState: { Values: role(project(measure("Sales", "Revenue"))) } },
		visualContainerObjects: {
			title: obj({ show: true, text: "Revenue" }),
		},
	},
});
```

- `name` is the id of the visual and its folder name. It must be unique on the page, use only `[A-Za-z0-9_-]`, and stay within 50 characters.
- `z` sets the stack order. A higher `z` draws on top.
- `visualType` takes a built-in type (49 known names) or a custom visual that you registered. A typo fails the typecheck.
- A group is a visual with `visualGroup` in place of `visual`. Children point at it with `parentGroupName: group.name`.

## Visual catalog

pbirkit reads Microsoft's visual catalog (`@microsoft/powerbi-core-visual-schema`). It lists the objects, properties, query roles and states of each built-in visual. Desktop ignores a name that it does not know, so the catalog turns a silent failure into a message.

- **Typecheck:** in `defineVisual`, an object name in `objects`, a property name in an entry, and a role name in `queryState` must be in the catalog for that `visualType`. Property values and `visualContainerObjects` have no catalog typecheck. The error names the bad name and the `pbirkit visual` command that lists the valid ones.
- **Build warnings:** `pbirkit build` also checks `visualContainerObjects`, enum values, selector state ids, the number of fields per role, and the visual styles of custom themes. A query must fit one of the field limits that the visual lists, so a pie chart with a `Series` field takes one `Y` field.
- **Lookup:** run `pbirkit visual cardVisual referenceLabel` to list the properties of one object (see [cli.md](cli.md#visual)).

The typecheck skips a custom visual, a `visualType` that is a union of types, and an `objects` value typed as a plain record.

The catalog can lag behind Desktop. When Desktop writes an object or property that the catalog lacks, add it to the Register (see below). `pbirkit import` does this for the objects in the report that it imports.

## A page

```ts
import { definePage } from "pbirkit/schemas/page/2.0.0";

import revenue from "./visuals/revenue-card.ts";

export default definePage({
	name: "overview",
	displayName: "Overview",
	width: 1280,
	height: 720,
	displayOption: "FitToPage",
	visuals: [revenue],
});
```

The order of `src/pages/index.ts` sets the page order.

## Bookmarks

Bookmarks refer to pages and visuals by their `.name`. Import the module and use the value, not a copied string:

```ts
explorationState: { activeSection: overview.name, /* ... */ }
```

`filterState` (from `pbirkit/expr`) builds the common shape of a bookmark filter. `branch`, `toggled` and `nest` build expansion states for matrices and trees.

## Register

`Register` from `pbirkit/register` holds project-wide types: custom visual types and custom fonts. Add to it with module augmentation:

```ts
declare module "pbirkit/register" {
	interface Register {
		readonly "import:Sales": {
			readonly builtinVisuals: readonly ["htmlContent443BE3AD55E043BF878BED274D3A6855"];
		};
	}
}
```

`visualObjects` adds objects and properties that the visual catalog lacks. Each visual type maps object names to a union of property names. Use `never` for an object with no properties:

```ts
declare module "pbirkit/register" {
	interface Register {
		readonly visualObjects: { readonly cardVisual: { readonly overflow: "type" } };
	}
}
```

`visualRoles` adds query roles that the visual catalog lacks. Each visual type maps to a union of role names:

```ts
declare module "pbirkit/register" {
	interface Register {
		readonly visualRoles: { readonly cardVisual: "NewRole" };
	}
}
```

`pbirkit import` writes both keys for names in the report that the catalog lacks.

Add a name to `visualObjects` or `visualRoles` only when a report that Desktop saved uses it. A name that Desktop does not know does nothing in the report, so never add one to clear a type error. Fix the name instead: `pbirkit visual TYPE` lists the names that the catalog takes.

Keep one tsconfig per project (see [setup.md](setup.md#one-tsconfig-per-project)).

## Key order

The build writes keys in the order that the TS object lists them. Desktop keeps the order that the file already has. Keep the order of the JSON when you port a change, or `--bytes` reports a difference.
