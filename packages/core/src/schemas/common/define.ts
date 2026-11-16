export type WithoutSchema<T> = T extends unknown ? Omit<T, "$schema"> : never;
