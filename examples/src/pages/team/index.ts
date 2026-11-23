import { barChart, scatterChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

export default reportPage({
	id: "team",
	filters: [{ field: columns.employee.office, label: "Office" }],
	kpis: [tiles.netSales, tiles.orders, tiles.avgOrderValue, tiles.discountRate, tiles.onTimeRate],
	visuals: [
		table({
			name: "team",
			at: cell(1, 12, top),
			title: "Account manager scorecard",
			subtitle: "One row per account manager. Discount rate is shaded: darker means more revenue given away.",
			columns: [
				{ field: columns.employee.employee, label: "Account manager" },
				{ field: columns.employee.title, label: "Role" },
				{ field: columns.employee.office, label: "Office" },
				{ field: measures.netSales, label: "Net sales", emphasis: "bar" },
				{ field: measures.netSalesYoYPct, label: "vs last year", emphasis: "signed" },
				{ field: measures.orders, label: "Orders" },
				{ field: measures.avgOrderValue, label: "Avg order value" },
				{ field: measures.activeCustomers, label: "Customers" },
				{ field: measures.discountRate, label: "Discount rate", emphasis: "heat" },
				{ field: measures.onTimeRate, label: "On time" },
			],
			sortBy: measures.netSales,
		}),
		scatterChart({
			name: "volume-value",
			at: cell(1, 7, bottom),
			title: "Order count against order value",
			subtitle: "Right means more orders, higher means bigger orders. Dot size is net sales.",
			category: columns.employee.employee,
			x: measures.orders,
			y: measures.avgOrderValue,
			size: measures.netSales,
		}),
		barChart({
			name: "discounting",
			at: cell(8, 5, bottom),
			title: "Discount rate by account manager",
			subtitle: "Share of gross sales given away in line discounts.",
			category: columns.employee.employee,
			value: measures.discountRate,
			tooltips: [measures.discountAmount, measures.discountedLineShare],
		}),
	],
});
