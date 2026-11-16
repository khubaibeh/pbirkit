import { Array, Boolean, Literal, NullOr, String, Struct, optionalKey } from "effect/Schema";

export const ReportArtifact = Struct({
	report: Struct({ path: String }),
});

export type ReportArtifact = typeof ReportArtifact.Type;

export const PbipSettings = Struct({
	enableAutoRecovery: optionalKey(Boolean),
});

export type PbipSettings = typeof PbipSettings.Type;

export const Pbip = Struct({
	$schema: optionalKey(
		Literal("https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json"),
	),
	version: String,
	artifacts: Array(ReportArtifact),
	settings: optionalKey(NullOr(PbipSettings)),
});

export type Pbip = typeof Pbip.Type;
