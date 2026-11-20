export interface Register {}

type ImportEntry<V> = 0 extends 1 & V ? never : V extends object ? V : never;

type ImportEntries<R> = {
	[K in keyof R]: K extends `import:${string}` ? ImportEntry<R[K]> : never;
}[keyof R];

export type RegisterEntries<R> = R | ImportEntries<R>;
