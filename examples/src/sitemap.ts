export const sections = ["Leadership", "Sales", "Customers", "Products", "Operations", "Profiles"] as const;

export type Section = (typeof sections)[number];

export interface PageEntry {
	readonly id: string;
	readonly title: string;
	readonly nav?: string;
	readonly section: Section;
	readonly audience: string;
	readonly question: string;
}

export const sitemap = [
	{
		id: "overview",
		title: "Business overview",
		nav: "Overview",
		section: "Leadership",
		audience: "Leadership · Weekly review",
		question: "How is the business doing, and is it growing faster or slower than last year?",
	},
	{
		id: "growth",
		title: "Growth drivers",
		section: "Leadership",
		audience: "Leadership · Planning",
		question: "Where did this year's change in sales come from: which categories, markets and people?",
	},
	{
		id: "scorecard",
		title: "Monthly scorecard",
		section: "Leadership",
		audience: "Leadership · Board pack",
		question: "Month by month, how do the headline measures move against the same month last year?",
	},
	{
		id: "trends",
		title: "Sales trends",
		section: "Sales",
		audience: "Sales · Commercial team",
		question: "What is the shape of demand over time, and does order size or order count drive it?",
	},
	{
		id: "team",
		title: "Sales team",
		section: "Sales",
		audience: "Sales · Team leads",
		question: "How does each account manager perform on revenue, order value, discounting and delivery?",
	},
	{
		id: "pricing",
		title: "Pricing & discounts",
		section: "Sales",
		audience: "Sales · Pricing",
		question: "How much revenue do discounts give away, where, and does a bigger discount buy a bigger order?",
	},
	{
		id: "markets",
		title: "Markets",
		section: "Customers",
		audience: "Customers · Regional managers",
		question: "Which countries and regions carry the business, and which are growing?",
	},
	{
		id: "portfolio",
		title: "Customer portfolio",
		section: "Customers",
		audience: "Customers · Account management",
		question: "How concentrated is revenue, and which valuable customers have gone quiet?",
	},
	{
		id: "retention",
		title: "Retention & cohorts",
		section: "Customers",
		audience: "Customers · Growth",
		question: "Do customers come back after their first order, and how quickly do new cohorts mature?",
	},
	{
		id: "products",
		title: "Product performance",
		section: "Products",
		audience: "Products · Category managers",
		question: "Which categories and products earn the revenue, at what price, and how widely do they sell?",
	},
	{
		id: "momentum",
		title: "Product momentum",
		section: "Products",
		audience: "Products · Range planning",
		question: "Which products are rising and which are fading compared with the same period last year?",
	},
	{
		id: "fulfilment",
		title: "Fulfilment",
		section: "Operations",
		audience: "Operations · Warehouse",
		question: "Do orders ship on time, how long do they take, and where do the late ones come from?",
	},
	{
		id: "freight",
		title: "Freight & carriers",
		section: "Operations",
		audience: "Operations · Logistics",
		question: "What does shipping cost as a share of sales, and how do the three carriers compare?",
	},
	{
		id: "customer",
		title: "Customer profile",
		section: "Profiles",
		audience: "Profiles · Drill through from any customer",
		question: "Everything about one customer: what they buy, how often, and how they are served.",
	},
	{
		id: "product",
		title: "Product profile",
		section: "Profiles",
		audience: "Profiles · Drill through from any product",
		question: "Everything about one product: who buys it, at what price, and how its sales are moving.",
	},
] as const satisfies ReadonlyArray<PageEntry>;

export type PageId = (typeof sitemap)[number]["id"];

export const pageEntry = (id: PageId): PageEntry => {
	const entry = sitemap.find((page) => page.id === id);
	if (entry === undefined) throw new Error(`sitemap: no page "${id}"`);
	return entry;
};
