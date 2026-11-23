import type { PageDefinition } from "pbirkit/schemas/page/2.1.0";

import { sitemap } from "#/sitemap.ts";
import type { PageId } from "#/sitemap.ts";
import customer from "./customer/index.ts";
import freight from "./freight/index.ts";
import fulfilment from "./fulfilment/index.ts";
import growth from "./growth/index.ts";
import markets from "./markets/index.ts";
import momentum from "./momentum/index.ts";
import overview from "./overview/index.ts";
import portfolio from "./portfolio/index.ts";
import pricing from "./pricing/index.ts";
import product from "./product/index.ts";
import products from "./products/index.ts";
import retention from "./retention/index.ts";
import scorecard from "./scorecard/index.ts";
import team from "./team/index.ts";
import trends from "./trends/index.ts";

const byId = {
	overview,
	growth,
	scorecard,
	trends,
	team,
	pricing,
	markets,
	portfolio,
	retention,
	products,
	momentum,
	fulfilment,
	freight,
	customer,
	product,
} satisfies Record<PageId, PageDefinition>;

export default sitemap.map(({ id }) => byId[id]);
