export interface ResourcePackageItemExpression<N extends string = string> {
	readonly ResourcePackageItem: {
		readonly PackageName: "RegisteredResources";
		readonly PackageType: 1;
		readonly ItemName: N;
	};
}

export const imageRef = <const N extends string>(image: {
	readonly kind: "image";
	readonly name: N;
}): ResourcePackageItemExpression<N> => ({
	ResourcePackageItem: { PackageName: "RegisteredResources", PackageType: 1, ItemName: image.name },
});
