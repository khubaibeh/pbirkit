import { Effect } from "effect";

import { SchemaUrl } from "@pbirkit/core/schema-url";
import { isBuiltinVisual } from "@pbirkit/core/visual-type";

import { importBookmarks } from "./bookmarks.ts";
import type { ImportOutput } from "./output.ts";
import { customVisualGuid, importResources } from "./resources.ts";
import { isName, jsonObject, object, requireObject, splitPlatform, strings } from "./source.ts";
import type { ArtifactFiles, Project } from "./source.ts";

const importPages = Effect.fnUntraced(function* (
	project: Project,
	files: ArtifactFiles,
	claimed: Set<string>,
	output: ImportOutput,
) {
	const metadata = "definition/pages/pages.json";
	const { pageOrder, ...pagesMetadata } = yield* requireObject(
		files.get(metadata),
		`${project.report}/${metadata}`,
	);
	const order = strings(pageOrder);
	const names =
		order ??
		[...files.keys()].flatMap((path) => {
			const [, name] = /^definition\/pages\/([^/]+)\/page\.json$/u.exec(path) ?? [];
			return name === undefined ? [] : [name];
		});
	if (order === undefined) output.fallback("Page order", "Inferred the order from page folders");

	const pages = [];
	const visualTypes = new Set<string>();
	for (const name of names) {
		const folder = `definition/pages/${name}`;
		const pagePath = `${folder}/page.json`;
		const page = isName(name) ? jsonObject(files.get(pagePath)) : undefined;
		if (page?.name !== name) {
			output.fallback(`Page ${name}`, "Could not map the page JSON to its folder name");
			continue;
		}

		claimed.add(pagePath);
		const visuals = [];
		const visualFolder = `${folder}/visuals/`;
		for (const [path, file] of files) {
			if (!path.startsWith(visualFolder)) continue;
			const [visualName, filename, ...rest] = path.slice(visualFolder.length).split("/");
			if (filename !== "visual.json" || rest.length > 0 || !isName(visualName)) continue;
			const visual = jsonObject(file);
			const type = object(visual?.visual)?.visualType;
			if (typeof type === "string" && !isBuiltinVisual(type)) visualTypes.add(type);
			if (
				visual?.name !== visualName ||
				!Object.values(SchemaUrl.visual).some((schema) => schema === visual.$schema)
			)
				continue;
			claimed.add(path);
			visuals.push(output.module(`pages/${page.name}/visuals/${visualName}.ts`, visual));
		}

		pages.push(output.module(`pages/${name}/page.ts`, { ...page, visuals }));
	}

	claimed.add(metadata);
	return { pagesMetadata, pages, visualTypes };
});

export const importReport = Effect.fnUntraced(function* (
	project: Project,
	files: ArtifactFiles,
	output: ImportOutput,
) {
	const definitionPath = "definition/report.json";
	const versionPath = "definition/version.json";
	const extensionsPath = "definition/reportExtensions.json";
	const diagramPath = "semanticModelDiagramLayout.json";
	const claimed = new Set([".platform", "definition.pbir", definitionPath, versionPath]);
	const { logicalId, platform } = yield* splitPlatform(files, project.report);
	const definition = yield* requireObject(files.get(definitionPath), `${project.report}/${definitionPath}`);
	const version = yield* requireObject(files.get(versionPath), `${project.report}/${versionPath}`);
	const { datasetReference: _datasetReference, ...pbir } = project.pbir;
	const { visualTypes, ...pages } = yield* importPages(project, files, claimed, output);
	const packages = importResources(definition, files, claimed, output);
	const packagedVisuals = new Set(
		Array.isArray(definition.resourcePackages) ? definition.resourcePackages.map(customVisualGuid) : [],
	);
	const types = [...visualTypes].toSorted();
	const registration = {
		visuals: types.filter((type) => packagedVisuals.has(type)).map((guid) => ({ guid })),
		builtinVisuals: types.filter((type) => !packagedVisuals.has(type)),
	};
	const bookmarks = importBookmarks(files, claimed, output);
	const extensionsData = jsonObject(files.get(extensionsPath));
	const extensions =
		extensionsData?.$schema === SchemaUrl.reportExtension["1.0.0"] ? extensionsData : undefined;
	const diagram = files.get(diagramPath);

	if (extensions !== undefined) claimed.add(extensionsPath);
	if (diagram !== undefined) claimed.add(diagramPath);
	const remaining = [...files.values()].filter((file) => !claimed.has(file.path));
	const groups = new Map<string, number>();
	for (const { path } of remaining) {
		const [first, second] = path.split("/");
		const group = first === "definition" && second !== undefined ? `${first}/${second}` : (first ?? path);
		groups.set(group, (groups.get(group) ?? 0) + 1);
	}
	for (const [group, count] of groups) {
		output.fallback(group, `Copied ${count} unmapped ${count === 1 ? "file" : "files"} into report.files`);
	}

	return {
		registration,
		report: {
			logicalId,
			platform,
			pbir: project.model === undefined ? project.pbir : pbir,
			...packages,
			version,
			...pages,
			...(bookmarks === undefined ? {} : { bookmarks }),
			...(extensions === undefined ? {} : { extensions }),
			...(diagram === undefined ? {} : { semanticModelDiagramLayout: output.asset("report", diagram) }),
			...(remaining.length === 0
				? {}
				: { files: Object.fromEntries(remaining.map((file) => [file.path, output.asset("report", file)])) }),
		},
	};
});
