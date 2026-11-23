import { barChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { PROFILE_CARD_HEIGHT, profileCard } from "#/components/profile-card.ts";
import { table } from "#/components/tables.ts";
import { columns, measures } from "#/fields.ts";
import { cell, rows, splitTop } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [body] = rows(1);
const [top, bottom] = rows(1, 1);
const [card, mix] = splitTop(cell(1, 4, body), PROFILE_CARD_HEIGHT);

export default reportPage({
	id: "customer",
	drillthrough: columns.customer.customer,
	filters: [{ field: columns.customer.customer, label: "Customer", single: true }],
	kpis: [tiles.netSales, tiles.orders, tiles.avgOrderValue, tiles.discountRate, tiles.onTimeRate],
	visuals: [
		...profileCard({
			at: card,
			title: measures.selectedCustomer,
			details: [measures.selectedCustomerDetail, measures.selectedCustomerPlace],
		}),
		barChart({
			name: "categories",
			at: mix,
			title: "What they buy",
			subtitle: "Net sales by category.",
			category: columns.product.category,
			value: measures.netSales,
			tooltips: [measures.unitsSold, measures.discountRate],
		}),
		trendChart({
			name: "purchases",
			at: cell(5, 8, top),
			title: "Net sales by month",
			subtitle: "This customer's spend. The dashed line is the same month last year.",
			category: columns.date.monthYear,
			value: measures.netSales,
			comparison: measures.netSalesPY,
			tooltips: [measures.orders],
		}),
		table({
			name: "products",
			at: cell(5, 4, bottom),
			title: "Products bought",
			subtitle: "Largest first.",
			columns: [
				{ field: columns.product.product, label: "Product" },
				{ field: measures.unitsSold, label: "Units" },
				{ field: measures.netSales, label: "Net sales", emphasis: "bar" },
				{ field: measures.discountRate, label: "Discount" },
			],
			sortBy: measures.netSales,
		}),
		table({
			name: "orders",
			at: cell(9, 4, bottom),
			title: "Order history",
			subtitle: "Every order in the period, newest first.",
			columns: [
				{ field: columns.orders.orderID, label: "Order" },
				{ field: columns.orders.shippedDate, label: "Shipped" },
				{ field: columns.orders.shippingStatus, label: "Status" },
				{ field: measures.orderValue, label: "Value" },
			],
			sortBy: columns.orders.orderID,
		}),
	],
});
