import { barChart, columnChart, scatterChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(3, 2);

export default reportPage({
	id: "markets",
	filters: [{ field: columns.customer.region, label: "Region" }],
	kpis: [tiles.netSales, tiles.activeCustomers, tiles.salesPerCustomer, tiles.ordersPerCustomer, tiles.freightShare],
	visuals: [
		barChart({
			name: "countries",
			at: cell(1, 4, top),
			title: "Net sales by country",
			subtitle: "Every market, largest first.",
			category: columns.customer.country,
			value: measures.netSales,
			tooltips: [measures.netSalesYoYPct, measures.activeCustomers],
		}),
		table({
			name: "country-table",
			at: cell(5, 8, top),
			title: "Country detail",
			subtitle: "Size, growth and depth of each market. Sorted by net sales.",
			columns: [
				{ field: columns.customer.country, label: "Country" },
				{ field: columns.customer.region, label: "Region" },
				{ field: measures.netSales, label: "Net sales", emphasis: "bar" },
				{ field: measures.netSalesYoYPct, label: "vs last year", emphasis: "signed" },
				{ field: measures.activeCustomers, label: "Customers" },
				{ field: measures.netSalesPerCustomer, label: "Per customer" },
				{ field: measures.avgOrderValue, label: "Avg order" },
				{ field: measures.freightPctOfSales, label: "Freight %" },
			],
			sortBy: measures.netSales,
		}),
		columnChart({
			name: "regions",
			at: cell(1, 4, bottom),
			title: "Net sales by region",
			subtitle: "Europe against the Americas.",
			category: columns.customer.region,
			value: measures.netSales,
			sortBy: measures.netSales,
		}),
		scatterChart({
			name: "breadth-depth",
			at: cell(5, 8, bottom),
			title: "Breadth against depth",
			subtitle: "Right means more customers, higher means more spent by each. Dot size is net sales.",
			category: columns.customer.country,
			x: measures.activeCustomers,
			y: measures.netSalesPerCustomer,
			size: measures.netSales,
		}),
	],
});
