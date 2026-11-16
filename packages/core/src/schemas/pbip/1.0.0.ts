import { Array, Boolean, Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

export const ReportArtifact = Struct({
	report: Struct({ path: String }),
});

export type ReportArtifact = typeof ReportArtifact.Type;

export const PbipSettings = Struct({
	enableAutoRecovery: optionalKey(Boolean),
});

export type PbipSettings = typeof PbipSettings.Type;

export const Pbip = Struct({
	$schema: optionalKey(Literal(SchemaUrl.pbip["1.0.0"])),
	version: String,
	artifacts: Array(ReportArtifact),
	settings: optionalKey(NullOr(PbipSettings)),
});

export type Pbip = typeof Pbip.Type;
