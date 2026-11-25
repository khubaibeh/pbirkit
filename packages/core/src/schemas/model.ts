import { Array, Record, String, Struct, URL as UrlSchema, Union, optionalKey } from "effect/Schema";

import { EditorSettings } from "#schemas/editor-settings/1.0.0.ts";
import { ModelReference } from "#schemas/model-reference/2.0.0.ts";
import { Pbism } from "#schemas/pbism/1.0.0.ts";
import { PlatformItem } from "#schemas/platform";
import type { WithPlatformIds } from "#schemas/platform";

/**
 * The `model` config entry. The build writes it as the `<name>.SemanticModel` folder.
 *
 * - `name`: The model name in `.platform`. Required unless `platform` is a URL.
 * - `path`: The model folder name, such as `Sales.SemanticModel`.
 * - `logicalId`: The stable id in `.platform`. Required unless `platform` is a URL.
 * - `platform`: The `.platform` file, as fields or as a URL to copy.
 * - `pbism`: The `definition.pbism` file, as fields or as a URL to copy.
 * - `definition`: A URL to the TMDL folder. The build copies it to `definition/`.
 * - `editorSettings`: The `.pbi/editorSettings.json` file.
 * - `diagramLayout`: A URL to copy as `diagramLayout.json`.
 * - `daxQueries`: A URL to the folder to copy as `DAXQueries/`.
 * - `tmdlScripts`: A URL to the folder to copy as `TMDLScripts/`.
 * - `unappliedChanges`: A URL to copy as `.pbi/unappliedChanges.json`.
 * - `cache`: A URL to a seed for `.pbi/cache.abf`, the data cache of Desktop.
 * - `modelReference`: The `modelReference.json` file, for an Analysis Services model.
 * - `files`: Extra files, keyed by the path inside the folder. A value is a URL to copy, or the file text. A
 *   key that ends in `/` maps a folder and takes a URL.
 * - `desktopOwned`: Paths inside the folder that Desktop owns. The build keeps them and never lists them for
 *   a port.
 */
export const Model = Struct({
	name: optionalKey(String),
	path: String,
	logicalId: optionalKey(String),
	platform: Union([PlatformItem, UrlSchema]),
	pbism: Union([Pbism, UrlSchema]),
	definition: UrlSchema,
	editorSettings: optionalKey(EditorSettings),
	diagramLayout: optionalKey(UrlSchema),
	daxQueries: optionalKey(UrlSchema),
	tmdlScripts: optionalKey(UrlSchema),
	unappliedChanges: optionalKey(UrlSchema),
	cache: optionalKey(UrlSchema),
	modelReference: optionalKey(ModelReference),
	files: optionalKey(Record(String, Union([UrlSchema, String]))),
	desktopOwned: optionalKey(Array(String)),
});

export type Model = typeof Model.Type;

/** The `model` input of `defineConfig`. Set `name` and `logicalId`, or give `platform` as a URL. */
export type ModelInput = WithPlatformIds<Model, "name" | "logicalId">;

export const defineModel = (model: ModelInput): ModelInput => model;
