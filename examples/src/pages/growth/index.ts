import { barChart, waterfallChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { topN } from "#/lib/filters.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

export default reportPage({
	id: "growth",
	kpis: [tiles.netSalesYTD, tiles.netSalesChange, tiles.orders, tiles.avgOrderValue, tiles.unitsSold],
	visuals: [
		waterfallChart({
			name: "category-bridge",
			at: cell(1, 7, top),
			title: "Change in net sales by category",
			subtitle:
				"Each step is one category's gain or loss on the same dates last year; the last bar is the total change.",
			category: columns.product.category,
			value: measures.netSalesYoY,
			tooltips: [measures.netSales, measures.netSalesPY, measures.netSalesYoYPct],
		}),
		barChart({
			name: "team-change",
			at: cell(8, 5, top),
			title: "Change by account manager",
			subtitle: "Net sales gained or lost against last year. Green grew, red shrank.",
			category: columns.employee.employee,
			value: measures.netSalesYoY,
			signed: true,
			tooltips: [measures.netSales, measures.netSalesYoYPct],
		}),
		table({
			name: "country-change",
			at: cell(1, 7, bottom),
			title: "Change by country",
			subtitle: "Sorted by the size of the change. Percentages are against the same dates last year.",
			columns: [
				{ field: columns.customer.country, label: "Country" },
				{ field: measures.netSales, label: "Net sales", emphasis: "bar" },
				{ field: measures.netSalesPY, label: "Last year" },
				{ field: measures.netSalesYoY, label: "Change", emphasis: "signed" },
				{ field: measures.netSalesYoYPct, label: "Change %", emphasis: "signed" },
				{ field: measures.activeCustomers, label: "Customers" },
			],
			sortBy: measures.netSalesYoY,
		}),
		barChart({
			name: "customer-gains",
			at: cell(8, 5, bottom),
			title: "Largest customer gains",
			subtitle: "The ten accounts that added the most net sales on last year.",
			category: columns.customer.customer,
			value: measures.netSalesYoY,
			signed: true,
			tooltips: [measures.netSales, measures.netSalesPY],
			filters: [topN(columns.customer.customer, measures.netSalesYoY, 10)],
		}),
	],
});
