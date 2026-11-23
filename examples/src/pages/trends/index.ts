import { columnChart, comboChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { columns, measures } from "#/fields.ts";
import { cell, rows } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [top, bottom] = rows(1, 1);

const history = trendChart({
	name: "history",
	at: cell(1, 8, top),
	title: "Net sales, full history",
	subtitle: "Every month on record, whatever the Year filter. The last month is a part month.",
	category: columns.date.monthYear,
	value: measures.netSales,
	tooltips: [measures.orders, measures.avgOrderValue],
});

export default reportPage({
	id: "trends",
	filters: [{ field: columns.product.category, label: "Category" }],
	ignoreYear: [history],
	kpis: [tiles.netSales, tiles.rolling3M, tiles.orders, tiles.avgOrderValue, tiles.linesPerOrder],
	visuals: [
		history,
		columnChart({
			name: "weekday",
			at: cell(9, 4, top),
			title: "Orders by weekday",
			subtitle: "The days customers place their orders.",
			category: columns.date.weekday,
			value: measures.orders,
		}),
		comboChart({
			name: "volume-value",
			at: cell(1, 8, bottom),
			title: "Order count and order value",
			subtitle: "Columns are orders placed; the line is the average order value on the right axis.",
			category: columns.date.monthYear,
			columns: measures.orders,
			line: measures.avgOrderValue,
		}),
		columnChart({
			name: "order-size",
			at: cell(9, 4, bottom),
			title: "Orders by size",
			subtitle: "How many orders fall into each value band.",
			category: columns.orders.orderSize,
			value: measures.ordersPlaced,
			tooltips: [measures.netSales],
		}),
	],
});
