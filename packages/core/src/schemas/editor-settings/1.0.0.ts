import { Boolean, Literal, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

/**
 * The `.pbi/editorSettings.json` file. It holds model editor settings that travel with the model.
 *
 * - `showHiddenFields`: When true, the field list shows hidden fields.
 * - `autodetectRelationships`: When true, Desktop finds relationships when you add tables.
 * - `parallelQueryLoading`: When true, Desktop runs several M queries at once.
 * - `typeDetectionEnabled`: When true, Desktop finds column types and headers for unstructured sources.
 * - `relationshipImportEnabled`: When true, Desktop imports relationships from the source on the first load.
 * - `relationshipRefreshEnabled`: When true, a refresh updates or deletes relationships.
 * - `runBackgroundAnalysis`: When true, the query editor loads data previews in the background.
 * - `shouldNotifyUserOfNameConflictResolution`: When true, Desktop tells the user when it renames a table or
 *   measure to fix a name clash.
 */
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
