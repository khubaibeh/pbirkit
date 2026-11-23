import { barChart, columnChart, trendChart } from "#/components/charts.ts";
import { reportPage } from "#/components/page.ts";
import { PROFILE_CARD_HEIGHT, profileCard } from "#/components/profile-card.ts";
import { columns, measures } from "#/fields.ts";
import { topN } from "#/lib/filters.ts";
import { cell, rows, splitTop } from "#/lib/layout.ts";
import { tiles } from "#/pages/tiles.ts";

const [body] = rows(1);
const [top, bottom] = rows(1, 1);
const [card, buyers] = splitTop(cell(1, 4, body), PROFILE_CARD_HEIGHT);

export default reportPage({
	id: "product",
	drillthrough: columns.product.product,
	filters: [{ field: columns.product.product, label: "Product", single: true }],
	kpis: [tiles.netSales, tiles.unitsSold, tiles.avgNetPrice, tiles.discountRate, tiles.activeCustomers],
	visuals: [
		...profileCard({
			at: card,
			title: measures.selectedProduct,
			details: [measures.selectedProductDetail, measures.selectedProductPrice],
		}),
		barChart({
			name: "customers",
			at: buyers,
			title: "Who buys it",
			subtitle: "The fifteen largest customers for this product.",
			category: columns.customer.customer,
			value: measures.netSales,
			tooltips: [measures.unitsSold],
			filters: [topN(columns.customer.customer, measures.netSales, 15)],
		}),
		trendChart({
			name: "sales",
			at: cell(5, 8, top),
			title: "Net sales by month",
			subtitle: "This product's sales. The dashed line is the same month last year.",
			category: columns.date.monthYear,
			value: measures.netSales,
			comparison: measures.netSalesPY,
			tooltips: [measures.unitsSold],
		}),
		barChart({
			name: "countries",
			at: cell(5, 4, bottom),
			title: "Where it sells",
			subtitle: "Net sales by country.",
			category: columns.customer.country,
			value: measures.netSales,
		}),
		columnChart({
			name: "discounts",
			at: cell(9, 4, bottom),
			title: "How it is discounted",
			subtitle: "Order lines in each discount band.",
			category: columns.sales.discountBand,
			value: measures.orderLines,
		}),
	],
});
