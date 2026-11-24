# Northwind Traders example

A 15-page Power BI report written with pbirkit. The [docs](../docs/README.md) explain each part.

## Structure

```
examples/
  pbirkit.config.ts      the report and model config
  src/
    pages/index.ts       the page list, in report order
    pages/<page>/        one module per page
    pages/tiles.ts       the KPI tiles that several pages share
    components/          shared builders: charts, KPI cards, slicers, tables, buttons, the navigation rail
    lib/                 the layout grid, groups, stacks, filters and conditional formats
    design.ts            colors and palettes
    themes/ledger.ts     the custom theme
    resources.ts         the theme and the resource packages
    sitemap.ts           the page sections, for the navigation rail
    fields.ts            every model field, written by scripts/generate-fields.ts
  model/                 the semantic model as TMDL files
  data/                  the CSV files that the model loads
  scripts/               the script that writes src/fields.ts from the TMDL files
```

## Data

The CSV files in `data/` come from [Maven Analytics' Northwind Traders data set](https://mavenanalytics.io/data-playground/northwind-traders).

The model reads them from a folder on the Windows machine that runs Desktop. To load the data:

1. Copy the `data/` folder to a place that Desktop can read, such as `C:/data/northwind/`.
2. Open the report in Desktop, then open Transform data (Power Query).
3. Set the `DataFolder` parameter to that folder. Use forward slashes, and end the path with a slash.
4. Refresh the data, then save.
