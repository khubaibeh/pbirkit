/** A reference to a file in the `RegisteredResources` package. `imageRef` builds it. */
export interface ResourcePackageItemExpression<N extends string = string> {
	readonly ResourcePackageItem: {
		readonly PackageName: "RegisteredResources";
		readonly PackageType: 1;
		readonly ItemName: N;
	};
}

/** Builds a reference to an image resource from `image` in `pbirkit/resource`, such as for a background image. */
export const imageRef = <const N extends string>(image: {
	readonly kind: "image";
	readonly name: N;
}): ResourcePackageItemExpression<N> => ({
	ResourcePackageItem: { PackageName: "RegisteredResources", PackageType: 1, ItemName: image.name },
});
