import { barChart, columnChart, scatterChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { topN } from "#/lib/filters.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

export default reportPage({
	id: "products",
	filters: [{ field: columns.product.category, label: "Category" }],
	kpis: [tiles.netSales, tiles.unitsSold, tiles.avgNetPrice, tiles.productsSold, tiles.discontinuedShare],
	visuals: [
		barChart({
			name: "categories",
			at: cell(1, 4, top),
			title: "Net sales by category",
			subtitle: "Largest first. Hover for units and price.",
			category: columns.product.category,
			value: measures.netSales,
			tooltips: [measures.unitsSold, measures.avgNetPrice],
		}),
		table({
			name: "products",
			at: cell(5, 8, top),
			title: "Top twenty products",
			subtitle: "Ranked by net sales. Right-click a row to open the product profile.",
			columns: [
				{ field: columns.product.product, label: "Product" },
				{ field: columns.product.category, label: "Category" },
				{ field: measures.netSales, label: "Net sales", emphasis: "bar" },
				{ field: measures.netSalesYoYPct, label: "vs last year", emphasis: "signed" },
				{ field: measures.unitsSold, label: "Units" },
				{ field: measures.avgNetPrice, label: "Net price" },
				{ field: measures.discountRate, label: "Discount" },
			],
			sortBy: measures.netSales,
			filters: [topN(columns.product.product, measures.netSales, 20)],
		}),
		scatterChart({
			name: "price-volume",
			at: cell(1, 8, bottom),
			title: "Price against volume",
			subtitle: "Right sells more units, higher sells at a higher net price. Dot size is net sales.",
			category: columns.product.product,
			x: measures.unitsSold,
			y: measures.avgNetPrice,
			size: measures.netSales,
		}),
		columnChart({
			name: "value-class",
			at: cell(9, 4, bottom),
			title: "Net sales by product class",
			subtitle: "A products make the top 70% of lifetime sales.",
			category: columns.product.valueClass,
			value: measures.netSales,
			tooltips: [measures.productsSold],
		}),
	],
});
