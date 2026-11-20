import { Effect } from "effect";

import type { ImportOutput } from "./output.ts";
import { jsonObject, requireObject, splitPlatform } from "./source.ts";
import type { ArtifactFiles } from "./source.ts";

export const importModel = Effect.fnUntraced(function* (
	folder: string,
	files: ArtifactFiles,
	output: ImportOutput,
) {
	const { displayName, ...platform } = yield* splitPlatform(files, folder);
	const pbism = yield* requireObject(files.get("definition.pbism"), `${folder}/definition.pbism`);
	const claimed = new Set([".platform", "definition.pbism"]);

	const json = (path: string) => {
		const data = jsonObject(files.get(path));
		if (data !== undefined) claimed.add(path);
		return data;
	};
	const asset = (path: string): ReturnType<ImportOutput["asset"]> | undefined => {
		const file = files.get(path);
		if (file === undefined) return undefined;
		claimed.add(path);
		return output.asset("model", file);
	};
	const folderFiles = (subfolder: string) => {
		const entries = [...files.values()].filter((file) => file.path.startsWith(`${subfolder}/`));
		for (const file of entries) claimed.add(file.path);
		return entries;
	};
	const optionalFolder = (subfolder: string) => {
		const entries = folderFiles(subfolder);
		return entries.length === 0 ? undefined : output.assetFolder("model", subfolder, entries);
	};

	const definition = output.assetFolder("model", "definition", folderFiles("definition"));
	const modelReference = json("modelReference.json");
	const editorSettings = json(".pbi/editorSettings.json");
	const diagramLayout = asset("diagramLayout.json");
	const unappliedChanges = asset(".pbi/unappliedChanges.json");
	const daxQueries = optionalFolder("DAXQueries");
	const tmdlScripts = optionalFolder("TMDLScripts");
	const remaining = [...files.values()].filter((file) => !claimed.has(file.path));
	const raw = Object.fromEntries(remaining.map((file) => [file.path, output.asset("model", file)]));

	output.fallback("Model definition", "Kept the semantic model definition in assets/model");
	if (remaining.length > 0) {
		output.fallback(
			"Model files",
			`Copied ${remaining.length} unmapped ${remaining.length === 1 ? "file" : "files"} into model.files`,
		);
	}

	return {
		name: displayName,
		path: folder,
		...platform,
		pbism,
		definition,
		...(modelReference === undefined ? {} : { modelReference }),
		...(editorSettings === undefined ? {} : { editorSettings }),
		...(diagramLayout === undefined ? {} : { diagramLayout }),
		...(unappliedChanges === undefined ? {} : { unappliedChanges }),
		...(daxQueries === undefined ? {} : { daxQueries }),
		...(tmdlScripts === undefined ? {} : { tmdlScripts }),
		...(remaining.length === 0 ? {} : { files: raw }),
	};
});
