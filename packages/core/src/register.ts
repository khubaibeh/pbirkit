export interface Register {}

export type RegisterEntries<R> = R | R[keyof R];
