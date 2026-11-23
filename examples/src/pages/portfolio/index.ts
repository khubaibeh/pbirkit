import { barChart, columnChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { only, topN } from "#/lib/filters.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

export default reportPage({
	id: "portfolio",
	filters: [{ field: columns.customer.region, label: "Region" }],
	kpis: [
		tiles.activeCustomers,
		tiles.top10Share,
		tiles.salesPerCustomer,
		tiles.customersAtRisk,
		tiles.daysSinceLastOrder,
	],
	visuals: [
		columnChart({
			name: "value-class",
			at: cell(1, 4, top),
			title: "Net sales by customer class",
			subtitle: "A customers make the top 70% of lifetime sales, B the next 20%, C the last 10%.",
			category: columns.customer.valueClass,
			value: measures.netSales,
			tooltips: [measures.customerCount, measures.netSalesPctOfTotal],
		}),
		columnChart({
			name: "recency",
			at: cell(5, 4, top),
			title: "Customers by recency",
			subtitle: "Active ordered in the last 60 days of data, Cooling in the last 120, Lapsed before that.",
			category: columns.customer.recency,
			value: measures.customerCount,
		}),
		barChart({
			name: "largest",
			at: cell(9, 4, top),
			title: "Concentration",
			subtitle: "Each of the ten largest accounts as a share of all net sales.",
			category: columns.customer.customer,
			value: measures.netSalesPctOfTotal,
			tooltips: [measures.netSales, measures.customerCumulativeShare],
			filters: [topN(columns.customer.customer, measures.netSales, 10)],
		}),
		table({
			name: "at-risk",
			at: cell(1, 8, bottom),
			title: "Valuable customers going quiet",
			subtitle:
				"Class A and B customers who are cooling or have lapsed. Right-click a row to open the customer profile.",
			columns: [
				{ field: columns.customer.customer, label: "Customer" },
				{ field: columns.customer.country, label: "Country" },
				{ field: columns.customer.valueClass, label: "Class" },
				{ field: columns.customer.recency, label: "Recency" },
				{ field: columns.customer.daysSinceLastOrder, label: "Days since order" },
				{ field: measures.netSales, label: "Net sales", emphasis: "bar" },
				{ field: measures.orders, label: "Orders" },
			],
			sortBy: measures.netSales,
			filters: [
				only(columns.customer.recency, ["Cooling", "Lapsed"]),
				only(columns.customer.valueClass, ["A · Top 70%", "B · Next 20%"]),
			],
		}),
		barChart({
			name: "risk-by-country",
			at: cell(9, 4, bottom),
			title: "Customers at risk by country",
			subtitle: "Cooling and lapsed customers.",
			category: columns.customer.country,
			value: measures.customersAtRisk,
		}),
	],
});
