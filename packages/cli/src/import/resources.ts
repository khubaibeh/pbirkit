import { posix } from "node:path";
import { isDeepStrictEqual } from "node:util";

import { resourcePackages } from "@pbirkit/core/build";
import type { CustomVisualResource } from "@pbirkit/core/custom-visual";
import { packageItem } from "@pbirkit/core/resource";

import type { TreeFile } from "../build/tree.ts";
import type { ImportOutput } from "./output.ts";
import { isName, jsonObject, object } from "./source.ts";
import type { ArtifactFiles, JsonObject } from "./source.ts";

const kinds = ["baseTheme", "customTheme", "builtInTheme", "image"] as const;

type StaticResource =
	| { readonly kind: "image"; readonly name: string; readonly file: TreeFile }
	| {
			readonly kind: Exclude<(typeof kinds)[number], "image">;
			readonly name: string;
			readonly file: TreeFile;
			readonly theme: JsonObject;
			readonly module: string;
	  };

export const customVisualGuid = (value: unknown) => {
	const pack = object(value);
	return pack?.type === "CustomVisual" && isName(pack.name) ? pack.name : undefined;
};

const findResources = (
	packages: unknown,
	files: ArtifactFiles,
): ReadonlyArray<StaticResource | CustomVisualResource> | undefined => {
	if (!Array.isArray(packages)) return undefined;

	const resources: Array<StaticResource | CustomVisualResource> = [];
	const usedFiles = new Set<string>();
	const usedModules = new Set<string>();

	for (const packageValue of packages) {
		const pack = object(packageValue);
		if (!Array.isArray(pack?.items)) return undefined;
		const guid = customVisualGuid(pack);
		if (guid !== undefined) {
			resources.push({ kind: "customVisual", guid, source: "file" });
			continue;
		}
		for (const value of pack.items) {
			const item = object(value);
			const name = item?.name;
			if (!isName(name)) return undefined;
			const kind = kinds.find((candidate) => {
				const expected = packageItem({ kind: candidate, name });
				return expected.package === pack.name && isDeepStrictEqual(expected.item, item);
			});
			if (kind === undefined) return undefined;

			const expected = packageItem({ kind, name });
			const file = files.get(`StaticResources/${expected.package}/${expected.item.path}`);
			if (file === undefined || usedFiles.has(file.path)) return undefined;
			usedFiles.add(file.path);

			if (kind === "image") {
				resources.push({ kind, name, file });
			} else {
				const theme = jsonObject(file);
				const module = `themes/${posix.basename(file.path, ".json")}.ts`;
				if (typeof theme?.name !== "string" || usedModules.has(module.toLowerCase())) return undefined;
				usedModules.add(module.toLowerCase());
				resources.push({ kind, name, file, theme, module });
			}
		}
	}

	return isDeepStrictEqual(resourcePackages(resources), packages) ? resources : undefined;
};

export const importResources = (
	definition: JsonObject,
	files: ArtifactFiles,
	claimed: Set<string>,
	output: ImportOutput,
) => {
	const { resourcePackages: packages, ...rest } = definition;
	if (packages === undefined) return { definition };

	const resources = findResources(packages, files);
	if (resources === undefined) {
		output.fallback(
			"Resource packages",
			"Kept the original package list and assets because the build could not reproduce the package list exactly",
		);
		return { definition };
	}

	return {
		definition: rest,
		resources: resources.map((resource) => {
			if (resource.kind === "customVisual") return resource;
			const { kind, name, file } = resource;
			claimed.add(file.path);
			return kind === "image"
				? { kind, name, file: output.asset("report", file) }
				: { kind, name, theme: output.module(resource.module, resource.theme) };
		}),
	};
};
