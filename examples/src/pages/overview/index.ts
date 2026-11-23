import { barChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { columns, measures } from "#/fields.ts";
import { topN } from "#/lib/filters.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(3, 2);

export default reportPage({
	id: "overview",
	filters: [{ field: columns.customer.region, label: "Region" }],
	kpis: [tiles.netSales, tiles.orders, tiles.avgOrderValue, tiles.activeCustomers, tiles.onTimeRate],
	visuals: [
		trendChart({
			name: "sales-trend",
			at: cell(1, 8, top),
			title: "Net sales by month",
			subtitle: "Solid line is the selected period; dashed line is the same months a year earlier.",
			category: columns.date.monthYear,
			value: measures.netSales,
			comparison: measures.netSalesPY,
			tooltips: [measures.orders, measures.netSalesYoYPct],
		}),
		barChart({
			name: "category-sales",
			at: cell(9, 4, top),
			title: "Net sales by category",
			subtitle: "Ranked by net sales. Hover a bar for the change on last year.",
			category: columns.product.category,
			value: measures.netSales,
			tooltips: [measures.netSalesYoYPct, measures.netSalesPctOfTotal],
		}),
		barChart({
			name: "country-sales",
			at: cell(1, 4, bottom),
			title: "Top markets",
			subtitle: "The eight countries with the most net sales.",
			category: columns.customer.country,
			value: measures.netSales,
			tooltips: [measures.netSalesYoYPct, measures.activeCustomers],
			filters: [topN(columns.customer.country, measures.netSales, 8)],
		}),
		barChart({
			name: "customer-sales",
			at: cell(5, 4, bottom),
			title: "Top customers",
			subtitle: "The eight largest accounts by net sales.",
			category: columns.customer.customer,
			value: measures.netSales,
			tooltips: [measures.orders, measures.netSalesYoYPct],
			filters: [topN(columns.customer.customer, measures.netSales, 8)],
		}),
		barChart({
			name: "team-sales",
			at: cell(9, 4, bottom),
			title: "Sales by account manager",
			subtitle: "Net sales booked by each member of the sales team.",
			category: columns.employee.employee,
			value: measures.netSales,
			tooltips: [measures.orders, measures.avgOrderValue],
		}),
	],
});
