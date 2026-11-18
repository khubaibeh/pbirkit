import { Boolean, Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

export const EditorSettings = Struct({
	$schema: optionalKey(Literal(SchemaUrl.editorSettings["1.0.0"])),
	version: optionalKey(String),
	showHiddenFields: optionalKey(Boolean),
	autodetectRelationships: optionalKey(Boolean),
	parallelQueryLoading: optionalKey(Boolean),
	typeDetectionEnabled: optionalKey(Boolean),
	relationshipImportEnabled: optionalKey(Boolean),
	relationshipRefreshEnabled: optionalKey(Boolean),
	runBackgroundAnalysis: optionalKey(Boolean),
	shouldNotifyUserOfNameConflictResolution: optionalKey(Boolean),
});

export type EditorSettings = typeof EditorSettings.Type;
