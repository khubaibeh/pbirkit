import type { Pbiviz } from "../custom-visual.ts";
import { packageItem } from "../resource.ts";
import type { PackageItem, Resource } from "../resource.ts";
import { toJson } from "./json.ts";
import type { BuildFile } from "./shared.ts";
import { whenSet } from "./shared.ts";

interface ResourcePackage {
	readonly name: string;
	readonly type: PackageItem["type"];
	readonly items: Array<PackageItem["item"]>;
}

export const resourcePackages = (resources: ReadonlyArray<Resource>): ReadonlyArray<ResourcePackage> => {
	const packages = new Map<string, ResourcePackage>();
	for (const resource of resources) {
		const { package: name, type, item } = packageItem(resource);
		const entry = packages.get(name) ?? { name, type, items: [] };
		entry.items.push(item);
		packages.set(name, entry);
	}
	return [...packages.values()];
};

const visualPackage = (guid: string, pbiviz: Pbiviz) => {
	const { name, displayName, version, description, supportUrl, gitHubUrl, visualClassName } = pbiviz.visual;
	return {
		version,
		author: pbiviz.author,
		resources: [{ resourceId: "rId0", sourceType: 5, file: `resources/${guid}.pbiviz.json` }],
		visual: { guid, name, displayName, version, description, supportUrl, gitHubUrl, visualClassName },
		metadata: { pbivizjson: { resourceId: "rId0" } },
	};
};

const customVisualFiles = (
	report: string,
	guid: string,
	pbiviz: Pbiviz | undefined,
): ReadonlyArray<BuildFile> =>
	whenSet(pbiviz, (definition) => {
		const folder = `${report}/CustomVisuals/${guid}`;
		return [
			{ path: `${folder}/package.json`, content: toJson(visualPackage(guid, definition)) },
			{ path: `${folder}/resources/${guid}.pbiviz.json`, content: toJson(definition) },
		];
	});

export const resourceFiles = (report: string, resource: Resource): ReadonlyArray<BuildFile> => {
	if (resource.kind === "customVisual") return customVisualFiles(report, resource.guid, resource.pbiviz);
	const { package: name, item } = packageItem(resource);
	const path = `${report}/StaticResources/${name}/${item.path}`;
	return [
		resource.kind === "image" ? { path, source: resource.file } : { path, content: toJson(resource.theme) },
	];
};
