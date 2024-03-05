/**
 * A TypeScript type alias called `Prettify`.
 *
 * Returns the same type it was given, but the properties are not intersected.
 * This means that the new type is easier to read and understand.
 */
export type Prettify<T> = T extends (infer L)[] ? Prettify<L>[] : { [K in keyof T]: T[K] } & {};

/**
 * Turns specific instances of the number, string, and boolean primitives to these primitives. If
 * not type is recognized, the same type is returned.
 *
 * @example
 * ToPrimitive<2> // -> number
 *
 * @example
 * ToPrimitive<"Hello"> // -> string
 *
 * @example
 * ToPrimitive<false> // -> boolean
 */
export type ToPrimitive<T> = T extends number
  ? number
  : T extends boolean
    ? boolean
    : T extends string
      ? string
      : T;

/**
 * Recursively removes readonly.
 */
export type RemoveReadOnly<T> =
  T extends Record<any, any>
    ? {
        -readonly [Key in keyof T]: RemoveReadOnly<T[Key]>;
      }
    : T;

/**
 * When given an array type returns the type of an element inside the array
 */
export type ArrayEntryType<T extends any[]> = T extends Array<infer EntryType> ? EntryType : never;

/**
 * Makes specific properties of a type required.
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Make keys of T optional.
 */
export type OptionalKeys<T extends Record<any, any>, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * The normal Omit breaks union types. This is a fix for that.
 */
export type UnionAwareOmit<TObj extends Record<string, any>, TKeys extends keyof TObj> = Prettify<
  TObj extends any ? Omit<TObj, TKeys> : never
>;
