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

Keep one tsconfig per project (see [setup.md](setup.md#one-tsconfig-per-project)).

## Key order

The build writes keys in the order that the TS object lists them. Desktop keeps the order that the file already has. Keep the order of the JSON when you port a change, or `--bytes` reports a difference.
