import { barChart, columnChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { matrix } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(3, 2);

const cohorts = matrix({
	name: "cohorts",
	at: cell(1, 8, top),
	title: "Cohort retention",
	subtitle:
		"Rows are the quarter of each customer's first order; columns are later quarters. Darker cells kept more of the cohort.",
	rows: [columns.customer.cohort],
	columns: [columns.date.yearQuarter],
	values: [{ field: measures.cohortRetention, label: "Retained", emphasis: "heat" }],
	cellWidth: 112,
	totals: false,
});

const intake = columnChart({
	name: "intake",
	at: cell(9, 4, top),
	title: "New customers by quarter",
	subtitle: "The size of each cohort when it joined.",
	category: columns.date.yearQuarter,
	value: measures.newCustomers,
});

export default reportPage({
	id: "retention",
	filters: [{ field: columns.customer.region, label: "Region" }],
	ignoreYear: [cohorts, intake],
	kpis: [
		tiles.activeCustomers,
		tiles.newCustomers,
		tiles.returningCustomers,
		tiles.repeatRate,
		tiles.ordersPerCustomer,
	],
	visuals: [
		cohorts,
		intake,
		trendChart({
			name: "active",
			at: cell(1, 8, bottom),
			title: "Active customers by month",
			subtitle: "Customers with at least one order in the month. The dashed line is the same month last year.",
			category: columns.date.monthYear,
			value: measures.activeCustomers,
			comparison: measures.activeCustomersPY,
		}),
		barChart({
			name: "orders-per-customer",
			at: cell(9, 4, bottom),
			title: "Orders per customer by class",
			subtitle: "How often each class of customer comes back.",
			category: columns.customer.valueClass,
			value: measures.ordersPerCustomer,
			sortBy: null,
		}),
	],
});
