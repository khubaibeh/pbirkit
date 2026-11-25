import { Array, Boolean, Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

/**
 * One report that the `.pbip` file opens.
 *
 * - `report.path`: The report folder, relative to the `.pbip` file. Use `/` as the separator.
 */
export const ReportArtifact = Struct({
	report: Struct({ path: String }),
});

export type ReportArtifact = typeof ReportArtifact.Type;

/**
 * Settings that Desktop applies when it opens the `.pbip` file.
 *
 * - `enableAutoRecovery`: When true, Desktop saves a copy of the open report and model from time to time, in
 *   case it crashes.
 */
export const PbipSettings = Struct({
	enableAutoRecovery: optionalKey(Boolean),
});

export type PbipSettings = typeof PbipSettings.Type;

/**
 * The `<name>.pbip` file at the project root. It points Desktop at the report folder.
 * The build fills `artifacts`, so config input omits it.
 *
 * - `version`: The version of the `.pbip` file format, such as `"1.0"`.
 * - `artifacts`: The reports that this file opens. Desktop expects one.
 */
export const Pbip = Struct({
	$schema: optionalKey(Literal(SchemaUrl.pbip["1.0.0"])),
	version: String,
	artifacts: Array(ReportArtifact),
	settings: optionalKey(NullOr(PbipSettings)),
});

export type Pbip = typeof Pbip.Type;
