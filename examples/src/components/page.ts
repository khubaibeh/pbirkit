import { definePage } from "pbirkit/schemas/page/2.1.0";
import type { PageDefinition } from "pbirkit/schemas/page/2.1.0";
import type { Visual } from "pbirkit/schemas/visual/2.13.0";

import type { Field } from "#/lib/frame.ts";
import { band, canvas, columns } from "#/lib/layout.ts";
import { stack } from "#/lib/stack.ts";
import { pageEntry } from "#/sitemap.ts";
import type { PageId } from "#/sitemap.ts";
import { filterName, pageHeader, yearFilter } from "./header.ts";
import type { Filter } from "./header.ts";
import { kpiStrip } from "./kpi.ts";
import type { Tile } from "./kpi.ts";
import { navigationRail } from "./rail.ts";

export interface ReportPageProps {
	readonly id: PageId;
	readonly filters?: ReadonlyArray<Filter>;
	readonly kpis: ReadonlyArray<Tile>;
	readonly visuals: ReadonlyArray<Visual>;
	readonly drillthrough?: Field;
	readonly ignoreYear?: ReadonlyArray<Visual>;
}

const drillthroughBinding = (id: PageId, field: Field) => ({
	filterConfig: {
		filters: [{ name: `${id}-drillthrough`, field, type: "Categorical" as const, howCreated: "Drillthrough" as const }],
	},
	pageBinding: {
		name: `${id}-binding`,
		type: "Drillthrough" as const,
		parameters: [{ name: `${id}-parameter`, boundFilter: `${id}-drillthrough`, fieldExpr: field }],
	},
});

export const reportPage = ({
	id,
	filters = [],
	kpis,
	visuals,
	drillthrough,
	ignoreYear = [],
}: ReportPageProps): PageDefinition => {
	const entry = pageEntry(id);
	const slicers = [...filters, yearFilter];
	const year = filterName(slicers.length - 1);
	for (const visual of ignoreYear)
		if (!visuals.includes(visual))
			throw new Error(`${id}: ignoreYear lists "${visual.name}", which is not on the page`);
	return definePage({
		name: id,
		displayName: entry.title,
		displayOption: "FitToPage",
		width: canvas.width,
		height: canvas.height,
		...(drillthrough === undefined ? {} : drillthroughBinding(id, drillthrough)),
		...(ignoreYear.length === 0
			? {}
			: {
					visualInteractions: ignoreYear.map(({ name }) => ({ source: year, target: name, type: "NoFilter" as const })),
				}),
		visuals: stack([
			...navigationRail(id),
			...pageHeader(entry, slicers),
			kpiStrip({ name: "kpis", at: { ...columns(1, 12), ...band.kpi }, tiles: kpis }),
			...visuals,
		]),
	});
};
