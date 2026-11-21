# Resources

Read this when you add a theme, an image, a custom visual or a custom font.

List resources in `report.resources`. The list order sets the order of `resourcePackages` in `report.json`. The build writes each file to `StaticResources/` or `CustomVisuals/`.

## Kinds

| Kind           | Helper (`pbirkit/resource`)                                   | Notes                                                                |
| -------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| base theme     | `baseTheme({ name, theme })`                                  | Desktop's base theme, in `SharedResources/BaseThemes`                |
| built-in theme | `builtInTheme({ name, theme })`                               | a Desktop built-in theme in the custom theme slot                    |
| custom theme   | `customTheme({ name, theme })`                                | your own theme, in `RegisteredResources`                             |
| image          | `image({ name, file: new URL(...) })`                         | copied as bytes                                                      |
| custom visual  | `customVisual({ guid, source })` from `pbirkit/custom-visual` | `source` is `appSource`, `file` (with a `.pbiviz`) or `organization` |

Typed Desktop default themes live in `pbirkit/themes/*`, for example `CY26SU07` and the accessible default.

## Theme rules

`defineTheme` (from `pbirkit/theme`) types the top level of a theme and all 64 options of Desktop's Customize theme dialog. `visualStyles` per visual type stays loose.

- Colors: `#` plus exactly 6 hex digits.
- Fonts: one of 26 built-in names, a Desktop font stack, or a custom family that you registered.
- Font sizes: whole numbers from 8 to 60. A fraction gives a warning, not an error.

Desktop rejects themes that break these rules, so `checkConfig` checks them before the build.

## Custom fonts

Add the family to `report.fonts`, and register it through `Register` so that the typecheck accepts it.

## Links

Link to a resource from a visual with `themeRef(...)` or `imageRef(...)`. `checkConfig` warns about a link to a resource that the list does not hold.
