/** Drops `$schema` from each member of a union. The `define*` helpers take this shape and add `$schema` back. */
export type WithoutSchema<T> = T extends unknown ? Omit<T, "$schema"> : never;
