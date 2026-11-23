import { barChart, scatterChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { columns, measures } from "#/fields.ts";
import { bottomN, topN } from "#/lib/filters.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

export default reportPage({
	id: "momentum",
	filters: [{ field: columns.product.category, label: "Category" }],
	kpis: [tiles.netSales, tiles.netSalesChange, tiles.unitsSold, tiles.productsSold, tiles.discontinuedShare],
	visuals: [
		scatterChart({
			name: "quadrants",
			at: cell(1, 8, top),
			title: "Volume change against revenue change",
			subtitle:
				"Units and net sales gained or lost on last year. Top right grows in both; bottom left shrinks in both. Dot size is net sales.",
			category: columns.product.product,
			x: measures.unitsSoldYoY,
			y: measures.netSalesYoY,
			size: measures.netSales,
			quadrants: true,
		}),
		barChart({
			name: "category-change",
			at: cell(9, 4, top),
			title: "Change by category",
			subtitle: "Net sales against the same dates last year.",
			category: columns.product.category,
			value: measures.netSalesYoYPct,
			signed: true,
			tooltips: [measures.netSales, measures.netSalesYoY],
		}),
		barChart({
			name: "risers",
			at: cell(1, 6, bottom),
			title: "Risers",
			subtitle: "The ten products that added the most net sales on last year.",
			category: columns.product.product,
			value: measures.netSalesYoY,
			signed: true,
			tooltips: [measures.netSales, measures.netSalesYoYPct],
			filters: [topN(columns.product.product, measures.netSalesYoY, 10)],
		}),
		barChart({
			name: "fallers",
			at: cell(7, 6, bottom),
			title: "Fallers",
			subtitle: "The ten products that lost the most net sales on last year.",
			category: columns.product.product,
			value: measures.netSalesYoY,
			signed: true,
			ascending: true,
			tooltips: [measures.netSales, measures.netSalesYoYPct],
			filters: [bottomN(columns.product.product, measures.netSalesYoY, 10)],
		}),
	],
});
