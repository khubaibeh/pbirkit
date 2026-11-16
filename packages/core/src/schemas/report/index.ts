import { Union } from "effect/Schema";

import { Report as ReportV1_0 } from "./1.0.0.ts";
import { Report as ReportV1_1 } from "./1.1.0.ts";
import { Report as ReportV1_2 } from "./1.2.0.ts";
import { Report as ReportV1_3 } from "./1.3.0.ts";
import { Report as ReportV2_0 } from "./2.0.0.ts";
import { Report as ReportV2_1 } from "./2.1.0.ts";
import { Report as ReportV3_0 } from "./3.0.0.ts";
import { Report as ReportV3_1 } from "./3.1.0.ts";
import { Report as ReportV3_2 } from "./3.2.0.ts";
import { Report as ReportV3_3 } from "./3.3.0.ts";

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

export const defineReport = (report: AnyReport): AnyReport => report;
