import { barChart, columnChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { topN } from "#/lib/filters.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

export default reportPage({
	id: "pricing",
	filters: [{ field: columns.product.category, label: "Category" }],
	kpis: [tiles.grossSales, tiles.discountAmount, tiles.discountRate, tiles.discountedLineShare, tiles.priceRealisation],
	visuals: [
		columnChart({
			name: "bands",
			at: cell(1, 6, top),
			title: "Order lines by discount band",
			subtitle: "Most lines sell at full price; the bands show how deep the rest are cut.",
			category: columns.sales.discountBand,
			value: measures.orderLines,
			tooltips: [measures.netSales, measures.discountAmount],
		}),
		barChart({
			name: "category-rate",
			at: cell(7, 6, top),
			title: "Discount rate by category",
			subtitle: "Share of gross sales given away, highest first.",
			category: columns.product.category,
			value: measures.discountRate,
			tooltips: [measures.discountAmount, measures.avgDiscountWhenGiven],
		}),
		table({
			name: "products",
			at: cell(1, 8, bottom),
			title: "Where the discount money goes",
			subtitle: "The fifteen products with the most revenue given away in discounts.",
			columns: [
				{ field: columns.product.product, label: "Product" },
				{ field: columns.product.category, label: "Category" },
				{ field: measures.discountAmount, label: "Discounts", emphasis: "bar" },
				{ field: measures.discountRate, label: "Rate", emphasis: "heat" },
				{ field: measures.avgDiscountWhenGiven, label: "Typical cut" },
				{ field: measures.netSales, label: "Net sales" },
				{ field: measures.priceRealisation, label: "Price realised" },
			],
			sortBy: measures.discountAmount,
			filters: [topN(columns.product.product, measures.discountAmount, 15)],
		}),
		barChart({
			name: "customer-rate",
			at: cell(9, 4, bottom),
			title: "Most discounted customers",
			subtitle: "Discount rate for the ten accounts given the most away.",
			category: columns.customer.customer,
			value: measures.discountRate,
			tooltips: [measures.discountAmount, measures.netSales],
			filters: [topN(columns.customer.customer, measures.discountAmount, 10)],
		}),
	],
});
