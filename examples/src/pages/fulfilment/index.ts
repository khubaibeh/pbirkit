import { barChart, columnChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);
const target = { value: 0.95, label: "95% target" };

export default reportPage({
	id: "fulfilment",
	filters: [{ field: columns.shipper.shipper, label: "Carrier" }],
	kpis: [tiles.shippedOrders, tiles.onTimeRate, tiles.lateOrders, tiles.daysToShip, tiles.openOrders],
	visuals: [
		trendChart({
			name: "on-time",
			at: cell(1, 8, top),
			title: "On-time delivery by month",
			subtitle: "Share of shipped orders that left by the required date. The dashed line is the same month last year.",
			category: columns.date.monthYear,
			value: measures.onTimeRate,
			comparison: measures.onTimeRatePY,
			target,
			tooltips: [measures.shippedOrders, measures.lateOrders],
		}),
		columnChart({
			name: "status",
			at: cell(9, 4, top),
			title: "Orders by shipping status",
			subtitle: "Not shipped means the order has no ship date yet.",
			category: columns.orders.shippingStatus,
			value: measures.ordersPlaced,
		}),
		barChart({
			name: "carriers",
			at: cell(1, 4, bottom),
			title: "On-time delivery by carrier",
			subtitle: "The dashed line is the 95% target.",
			category: columns.shipper.shipper,
			value: measures.onTimeRate,
			target,
			tooltips: [measures.shippedOrders, measures.avgDaysLate],
		}),
		barChart({
			name: "days-to-ship",
			at: cell(5, 4, bottom),
			title: "Days to ship by account manager",
			subtitle: "Average days from order to shipment.",
			category: columns.employee.employee,
			value: measures.avgDaysToShip,
		}),
		table({
			name: "late-by-country",
			at: cell(9, 4, bottom),
			title: "Where late orders go",
			subtitle: "Countries with the most late shipments.",
			columns: [
				{ field: columns.customer.country, label: "Country" },
				{ field: measures.lateOrders, label: "Late", emphasis: "bar" },
				{ field: measures.onTimeRate, label: "On time" },
				{ field: measures.avgDaysLate, label: "Days late" },
			],
			sortBy: measures.lateOrders,
		}),
	],
});
