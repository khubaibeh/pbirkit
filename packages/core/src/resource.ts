import { Literal, String, Struct, URL as UrlSchema, Union } from "effect/Schema";

import { Theme } from "#schemas/theme";

import { CustomVisualResource } from "./custom-visual.ts";

export const BaseThemeResource = Struct({ kind: Literal("baseTheme"), name: String, theme: Theme });

export type BaseThemeResource = typeof BaseThemeResource.Type;

export const CustomThemeResource = Struct({ kind: Literal("customTheme"), name: String, theme: Theme });

export type CustomThemeResource = typeof CustomThemeResource.Type;

export const BuiltInThemeResource = Struct({ kind: Literal("builtInTheme"), name: String, theme: Theme });

export type BuiltInThemeResource = typeof BuiltInThemeResource.Type;

export const ImageResource = Struct({ kind: Literal("image"), name: String, file: UrlSchema });

export type ImageResource = typeof ImageResource.Type;

export const Resource = Union([
	BaseThemeResource,
	CustomThemeResource,
	BuiltInThemeResource,
	ImageResource,
	CustomVisualResource,
]);

export type Resource = typeof Resource.Type;

export interface PackageItem {
	readonly package: string;
	readonly type: "CustomVisual" | "RegisteredResources" | "SharedResources";
	readonly item: { readonly name: string; readonly path: string; readonly type: string };
}

const STATIC_ITEMS = {
	baseTheme: {
		package: "SharedResources",
		type: "BaseTheme",
		path: (name: string) => `BaseThemes/${name}.json`,
	},
	customTheme: { package: "RegisteredResources", type: "CustomTheme", path: (name: string) => name },
	builtInTheme: {
		package: "SharedResources",
		type: "CustomTheme",
		path: (name: string) => `BuiltInThemes/${name}.json`,
	},
	image: { package: "RegisteredResources", type: "Image", path: (name: string) => name },
} as const;

type ResourceIdentity =
	| Pick<CustomVisualResource, "kind" | "guid">
	| { readonly kind: Exclude<Resource["kind"], "customVisual">; readonly name: string };

export const packageItem = (resource: ResourceIdentity): PackageItem => {
	if (resource.kind === "customVisual") {
		const name = `${resource.guid}.pbiviz.json`;
		return {
			package: resource.guid,
			type: "CustomVisual",
			item: { name, path: name, type: "CustomVisualMetadata" },
		};
	}
	const { package: name, type, path } = STATIC_ITEMS[resource.kind];
	return { package: name, type: name, item: { name: resource.name, path: path(resource.name), type } };
};

export const baseTheme = <const N extends string>(resource: { readonly name: N; readonly theme: Theme }) => ({
	kind: "baseTheme" as const,
	...resource,
});

export const customTheme = <const N extends string>(resource: {
	readonly name: N;
	readonly theme: Theme;
}) => ({
	kind: "customTheme" as const,
	...resource,
});

export const builtInTheme = <const N extends string>(resource: {
	readonly name: N;
	readonly theme: Theme;
}) => ({
	kind: "builtInTheme" as const,
	...resource,
});

export const image = <const N extends string>(resource: { readonly name: N; readonly file: URL }) => ({
	kind: "image" as const,
	...resource,
});

export const themeRef = <const N extends string, const V>(
	theme: { readonly kind: "baseTheme" | "customTheme" | "builtInTheme"; readonly name: N },
	reportVersionAtImport: V,
) => ({
	name: theme.name,
	reportVersionAtImport,
	type: theme.kind === "customTheme" ? ("RegisteredResources" as const) : ("SharedResources" as const),
});
