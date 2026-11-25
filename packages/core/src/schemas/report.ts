import { Union } from "effect/Schema";

import { Report as ReportV1_0 } from "./report/1.0.0.ts";
import { Report as ReportV1_1 } from "./report/1.1.0.ts";
import { Report as ReportV1_2 } from "./report/1.2.0.ts";
import { Report as ReportV1_3 } from "./report/1.3.0.ts";
import { Report as ReportV2_0 } from "./report/2.0.0.ts";
import { Report as ReportV2_1 } from "./report/2.1.0.ts";
import { Report as ReportV3_0 } from "./report/3.0.0.ts";
import { Report as ReportV3_1 } from "./report/3.1.0.ts";
import { Report as ReportV3_2 } from "./report/3.2.0.ts";
import { Report as ReportV3_3 } from "./report/3.3.0.ts";

/** A `report.json` of any supported version. `$schema` picks the version. */
export const AnyReport = Union([
	ReportV1_0,
	ReportV1_1,
	ReportV1_2,
	ReportV1_3,
	ReportV2_0,
	ReportV2_1,
	ReportV3_0,
	ReportV3_1,
	ReportV3_2,
	ReportV3_3,
]);

export type AnyReport = typeof AnyReport.Type;
