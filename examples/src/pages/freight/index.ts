import { barChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { topN } from "#/lib/filters.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

export default reportPage({
	id: "freight",
	filters: [{ field: columns.shipper.shipper, label: "Carrier" }],
	kpis: [tiles.freight, tiles.freightShare, tiles.freightPerOrder, tiles.shippedOrders, tiles.daysToShip],
	visuals: [
		trendChart({
			name: "freight",
			at: cell(1, 8, top),
			title: "Freight cost by month",
			subtitle: "The dashed line is the same month last year.",
			category: columns.date.monthYear,
			value: measures.freight,
			comparison: measures.freightPY,
			tooltips: [measures.freightPctOfSales, measures.ordersShipped],
		}),
		barChart({
			name: "by-carrier",
			at: cell(9, 4, top),
			title: "Freight by carrier",
			subtitle: "Total freight billed to customers.",
			category: columns.shipper.shipper,
			value: measures.freight,
			tooltips: [measures.avgFreightPerOrder],
		}),
		table({
			name: "carriers",
			at: cell(1, 7, bottom),
			title: "Carrier comparison",
			subtitle: "Cost and service side by side.",
			columns: [
				{ field: columns.shipper.shipper, label: "Carrier" },
				{ field: measures.shippedOrders, label: "Orders" },
				{ field: measures.freight, label: "Freight", emphasis: "bar" },
				{ field: measures.avgFreightPerOrder, label: "Per order" },
				{ field: measures.freightPctOfSales, label: "% of sales" },
				{ field: measures.onTimeRate, label: "On time" },
				{ field: measures.avgDaysToShip, label: "Days to ship" },
			],
			sortBy: measures.freight,
		}),
		barChart({
			name: "share-by-country",
			at: cell(8, 5, bottom),
			title: "Freight as % of sales, by country",
			subtitle: "The ten countries where shipping costs most relative to what they buy.",
			category: columns.customer.country,
			value: measures.freightPctOfSales,
			tooltips: [measures.freight, measures.netSales],
			filters: [topN(columns.customer.country, measures.freightPctOfSales, 10)],
		}),
	],
});
