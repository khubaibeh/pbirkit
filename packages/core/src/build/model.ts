import { Option } from "effect";

import type { Config } from "../config.ts";
import type { BuildFile } from "./shared.ts";
import { jsonFile, jsonOrSource, platform, rawFiles, whenSet, withoutDot } from "./shared.ts";

type Model = NonNullable<Config["model"]>;

export const modelOf = (config: Config): Option.Option<Model> => Option.fromNullishOr(config.model);

export const modelFolder = (model: Model): string => withoutDot(model.path);

export interface ModelCache {
	readonly path: string;
	readonly seed: Option.Option<URL>;
}

export const modelCache = (config: Config): Option.Option<ModelCache> =>
	Option.map(modelOf(config), (model) => ({
		path: `${modelFolder(model)}/.pbi/cache.abf`,
		seed: Option.fromNullishOr(model.cache),
	}));

export const modelFiles = (model: Model): ReadonlyArray<BuildFile> => {
	const folder = modelFolder(model);

	return [
		jsonOrSource(
			`${folder}/.platform`,
			model.platform instanceof URL
				? model.platform
				: platform("SemanticModel", model.name, model.logicalId, model.platform),
		),
		jsonOrSource(`${folder}/definition.pbism`, model.pbism),
		...whenSet(model.modelReference, (reference) => [jsonFile(`${folder}/modelReference.json`, reference)]),
		...whenSet(model.editorSettings, (settings) => [
			jsonFile(`${folder}/.pbi/editorSettings.json`, settings),
		]),
		{ path: `${folder}/definition`, sourceFolder: model.definition },
		...whenSet(model.diagramLayout, (source) => [{ path: `${folder}/diagramLayout.json`, source }]),
		...whenSet(model.daxQueries, (sourceFolder) => [{ path: `${folder}/DAXQueries`, sourceFolder }]),
		...whenSet(model.tmdlScripts, (sourceFolder) => [{ path: `${folder}/TMDLScripts`, sourceFolder }]),
		...whenSet(model.unappliedChanges, (source) => [
			{ path: `${folder}/.pbi/unappliedChanges.json`, source },
		]),
		...whenSet(model.files, (files) => rawFiles(folder, files)),
	];
};
