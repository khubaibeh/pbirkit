import { String, Struct, URL as UrlSchema, optionalKey } from "effect/Schema";

import { EditorSettings } from "#schemas/editor-settings/1.0.0.ts";
import { ModelReference } from "#schemas/model-reference/2.0.0.ts";
import { Pbism } from "#schemas/pbism/1.0.0.ts";
import { PlatformItem } from "#schemas/platform";

export const Model = Struct({
	name: String,
	path: String,
	logicalId: String,
	platform: PlatformItem,
	pbism: Pbism,
	definition: UrlSchema,
	editorSettings: optionalKey(EditorSettings),
	diagramLayout: optionalKey(UrlSchema),
	daxQueries: optionalKey(UrlSchema),
	cache: optionalKey(UrlSchema),
	modelReference: optionalKey(ModelReference),
});

export type Model = typeof Model.Type;

export const defineModel = (model: Model): Model => model;
