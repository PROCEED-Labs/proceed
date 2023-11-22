/**
 * A TypeScript type alias called `Prettify`.
 *
 * Returns the same type it was given, but the properties are not intersected.
 * This means that the new type is easier to read and understand.
 */
export type Prettify<T> = T extends (infer L)[] ? Prettify<L>[] : { [K in keyof T]: T[K] } & {};
