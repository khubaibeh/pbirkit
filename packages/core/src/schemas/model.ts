import { Array, Record, String, Struct, URL as UrlSchema, Union, optionalKey } from "effect/Schema";

import { EditorSettings } from "#schemas/editor-settings/1.0.0.ts";
import { ModelReference } from "#schemas/model-reference/2.0.0.ts";
import { Pbism } from "#schemas/pbism/1.0.0.ts";
import { PlatformItem } from "#schemas/platform";
import type { WithPlatformIds } from "#schemas/platform";

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

export type ModelInput = WithPlatformIds<Model, "name" | "logicalId">;

export const defineModel = (model: ModelInput): ModelInput => model;
