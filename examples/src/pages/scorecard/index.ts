import { columnChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { matrix } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(3, 2);

const months = matrix({
	name: "scorecard",
	at: cell(1, 12, top),
	title: "Headline measures by month",
	subtitle:
		"Every month on record, oldest first, whatever the Year filter. Change columns compare with the same month a year earlier.",
	rows: [columns.date.monthYear],
	values: [
		{ field: measures.netSales, label: "Net sales", emphasis: "bar" },
		{ field: measures.netSalesYoYPct, label: "vs last year", emphasis: "signed" },
		{ field: measures.orders, label: "Orders" },
		{ field: measures.ordersYoYPct, label: "Orders vs LY", emphasis: "signed" },
		{ field: measures.avgOrderValue, label: "Avg order value" },
		{ field: measures.activeCustomers, label: "Customers" },
		{ field: measures.newCustomers, label: "New customers" },
		{ field: measures.discountRate, label: "Discount rate", emphasis: "heat" },
		{ field: measures.onTimeRate, label: "On time" },
		{ field: measures.freightPctOfSales, label: "Freight %" },
	],
});

export default reportPage({
	id: "scorecard",
	ignoreYear: [months],
	kpis: [tiles.netSalesYTD, tiles.orders, tiles.activeCustomers, tiles.discountRate, tiles.freight],
	visuals: [
		months,
		trendChart({
			name: "ytd",
			at: cell(1, 7, bottom),
			title: "Year to date against last year",
			subtitle: "Running total from 1 January. The gap between the lines is the growth so far.",
			category: columns.date.monthYear,
			value: measures.netSalesYTD,
			comparison: measures.netSalesYTDPY,
		}),
		columnChart({
			name: "new-customers",
			at: cell(8, 5, bottom),
			title: "New customers by month",
			subtitle: "Customers placing their first ever order.",
			category: columns.date.monthYear,
			value: measures.newCustomers,
		}),
	],
});
