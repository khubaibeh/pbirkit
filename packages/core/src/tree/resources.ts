import { Result } from "effect";

import { Theme } from "#schemas/theme";

import { insideProject } from "../build/shared.ts";
import { at } from "../expr/query.ts";
import { packageItem, samePackageItem } from "../resource.ts";
import type { ResourceIdentity } from "../resource.ts";
import type { Content, IndexedFile, ReportFiles } from "./shared.ts";
import { decoded, fileContent, list, string } from "./shared.ts";

type ThemeIdentity = Extract<
	ResourceIdentity,
	{ readonly kind: "baseTheme" | "builtInTheme" | "customTheme" }
>;

export type ResourceData =
	| (Extract<ResourceIdentity, { readonly kind: "customVisual" }> & { readonly source: "file" })
	| Extract<ResourceIdentity, { readonly kind: "image" }>
	| (ThemeIdentity & { readonly theme: Theme });

export interface ResourceNode extends IndexedFile<ResourceData> {
	readonly name: string;
	readonly kind: "theme" | "image" | "customVisual" | "resource";
	readonly files: ReadonlyArray<string>;
}

interface PackageEntry {
	readonly package: string;
	readonly item: { readonly name: string; readonly path: string; readonly type: string };
}

const IDENTITIES: Readonly<Record<string, (name: string) => ResourceIdentity>> = {
	"RegisteredResources/CustomTheme": (name) => ({ kind: "customTheme", name }),
	"RegisteredResources/Image": (name) => ({ kind: "image", name }),
	"SharedResources/BaseTheme": (name) => ({ kind: "baseTheme", name }),
	"SharedResources/CustomTheme": (name) => ({ kind: "builtInTheme", name }),
};

const readTheme = decoded(Theme, "theme");

const isImageTheme = (report: unknown, { package: name, item }: PackageEntry): boolean => {
	const custom = at(at(report, "themeCollection"), "customTheme");
	return (
		name === "RegisteredResources" &&
		item.type === "Image" &&
		at(custom, "type") === "RegisteredResources" &&
		at(custom, "name") === item.name
	);
};

const identityOf = (
	report: unknown,
	entry: PackageEntry,
	customVisual: boolean,
): ResourceIdentity | undefined => {
	if (customVisual) return { kind: "customVisual", guid: entry.package };
	if (isImageTheme(report, entry)) return { kind: "customTheme", name: entry.item.name, itemType: "Image" };
	return IDENTITIES[`${entry.package}/${entry.item.type}`]?.(entry.item.name);
};

const kindOf = (identity: ResourceIdentity | undefined): ResourceNode["kind"] => {
	if (identity === undefined) return "resource";
	if (identity.kind === "customVisual" || identity.kind === "image") return identity.kind;
	return "theme";
};

const contentOf = (
	files: ReportFiles,
	identity: ResourceIdentity | undefined,
	entry: PackageEntry,
	path: string,
): Content<ResourceData> => {
	if (identity === undefined || !samePackageItem(packageItem(identity), entry))
		return Result.fail("Unsupported resource package item");
	if (identity.kind === "customVisual") return Result.succeed({ ...identity, source: "file" });
	if (!files.has(path)) return Result.fail("Resource file is missing");
	if (identity.kind === "image") return Result.succeed(identity);
	const value = files.json(path);
	if (at(value, "$schema") !== undefined) return Result.fail("Unknown theme $schema");
	return Result.map(fileContent(files, path, value, readTheme), (theme) => ({ ...identity, theme }));
};

export const resourcesOf = (files: ReportFiles): ReadonlyArray<ResourceNode> => {
	const report = files.json(`${files.report}/definition/report.json`);
	return list(at(report, "resourcePackages")).flatMap((pack) => {
		const packageName = string(at(pack, "name"));
		if (packageName === undefined || !insideProject(packageName)) return [];
		const customVisual = at(pack, "type") === "CustomVisual";
		const folder = `${files.report}/${customVisual ? "CustomVisuals" : "StaticResources"}/${packageName}`;
		return list(at(pack, "items")).flatMap((item): ReadonlyArray<ResourceNode> => {
			const name = string(at(item, "name"));
			const itemPath = string(at(item, "path"));
			if (name === undefined || itemPath === undefined || !insideProject(itemPath)) return [];
			const entry = {
				package: packageName,
				item: { name, path: itemPath, type: string(at(item, "type")) ?? "" },
			};
			const identity = identityOf(report, entry, customVisual);
			const path = customVisual ? `${folder}/resources/${itemPath}` : `${folder}/${itemPath}`;
			return [
				{
					path,
					name: customVisual ? packageName : name,
					kind: kindOf(identity),
					files: customVisual ? files.paths.filter((file) => file.startsWith(`${folder}/`)) : [path],
					content: contentOf(files, identity, entry, path),
				},
			];
		});
	});
};
