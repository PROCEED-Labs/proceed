export async function asyncMap<Type, TReturn>(
  array: Array<Type>,
  cb: (entry: Type, index: number) => Promise<TReturn>,
) {
  const mappingCallbacks = array.map(async (entry, index) => await cb(entry, index));

  const mappedValues = await Promise.all(mappingCallbacks);

  return mappedValues as Array<TReturn>;
}

export async function asyncForEach<Type>(
  array: Array<Type>,
  cb: (entry: Type, index: number) => Promise<void>,
) {
  await asyncMap(array, cb);
}

export async function asyncFilter<Type>(array: Array<Type>, cb: (entry: Type) => Promise<boolean>) {
  // map the elements to their value or undefined and then filter undefined entries
  return (
    await asyncMap(array, async (entry) => {
      const keep = await cb(entry);
      return keep ? entry : undefined;
    })
  ).filter((entry) => entry) as Array<Type>;
}

export interface DiffResult {
  path: string;
  valueA: any;
  valueB: any;
  reason: string;
}

// TODO: Typescriptify or remove
/**
 * Compares two values
 *
 * normal comparison for fundamental data types (number, string etc)
 * element wise comparison for objects and arrays
 * recursive handling for nested objects and arrays
 *
 * @param {Any} a some value
 * @param {Any} b some value
 * @returns {Boolean} - if the two values are equal
 */
export function deepEquals(
  a: any,
  b: any,
  path = '',
  verbose = false,
): boolean | DiffResult | null {
  // Early exit if types don't match
  if (typeof a !== typeof b) {
    if (verbose) {
      return {
        path,
        valueA: a,
        valueB: b,
        reason: 'Type mismatch',
      };
    }
    return false;
  }

  // Arrays comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      if (verbose) {
        return {
          path,
          valueA: a,
          valueB: b,
          reason: 'Array length mismatch',
        };
      }
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      const result = deepEquals(a[i], b[i], `${path}[${i}]`, verbose);
      if (result) {
        return verbose ? result : false;
      }
    }

    return verbose ? null : true; // Arrays are equal
  }

  // Objects comparison
  if (typeof a === 'object' && a !== null && b !== null) {
    let aKeys = Object.keys(a);
    let bKeys = Object.keys(b);

    // Objects can't be equal with differing keys
    if (aKeys.length !== bKeys.length || aKeys.some((key) => !bKeys.includes(key))) {
      if (verbose) {
        return {
          path,
          valueA: a,
          valueB: b,
          reason: 'Object keys mismatch',
        };
      }
      return false;
    }

    // Recursively compare all keys and values
    for (let key of aKeys) {
      const result = deepEquals(a[key], b[key], path ? `${path}.${key}` : key, verbose);
      if (result) {
        return verbose ? result : false;
      }
    }

    return verbose ? null : true; // Objects are equal
  }

  // Primitive values comparison
  if (a !== b) {
    if (verbose) {
      return {
        path,
        valueA: a,
        valueB: b,
        reason: 'Value mismatch',
      };
    }
    return false;
  }

  return verbose ? null : true; // Values are equal
}

// TODO: Typescriptify or remove
export function isObject(candidate: any) {
  return !!candidate && typeof candidate === 'object' && !Array.isArray(candidate);
}

// TODO: Typescriptify or remove
/**
 * Function that allows overwriting entries in an object with values given in another object
 *
 * @param {Object} target the object to merge into
 * @param {Object} toMerge the object containing the new values
 * @param {Boolean} deepMerge if nested objects are supposed to be merged recursively (else they are just overwritten)
 * @param {Boolean|String} noNewValues flag to disallow new entries being added to the target object ('strict' for error, true for silent ignore)
 * @param {Boolean|String} typesafe if entries are not allowed to change their type ('strict' for error, true for silent ignore)
 * @returns {Object} object containing the values that were actually changed (some changes might be silently ignored due to flags)
 */
export function mergeIntoObject(
  target: any,
  toMerge: any,
  deepMerge: any,
  noNewValues: any,
  typesafe: any,
) {
  if (!isObject(target)) {
    throw new Error('Tried to merge into something that is not an object');
  }

  if (!isObject(toMerge)) {
    throw new Error('Tried to merge something that is not an object');
  }

  const changedEntries: any = {};

  Object.entries(toMerge).forEach(([key, value]) => {
    // handle if adding entries is not allowed and target doesn't contain the current key
    if (noNewValues && !{}.propertyIsEnumerable.call(target, key)) {
      if (noNewValues === 'strict') {
        // throw in strict mode
        throw new Error('Tried to add new values to target object!');
      } else {
        // silently ignore
        return;
      }
    }

    // do nothing if the given key exists but its value has a different type from the one in the target and typesafe is true
    if (
      typesafe &&
      {}.propertyIsEnumerable.call(target, key) &&
      typeof value !== typeof target[key]
    ) {
      if (typesafe === 'strict') {
        throw new Error(`Tried changing the type of entry ${key}!`);
      } else {
        return;
      }
    }

    // recursively merge objects if flag is set
    if (deepMerge && isObject(value) && isObject(target[key])) {
      changedEntries[key] = mergeIntoObject(target[key], value, deepMerge, noNewValues, typesafe);
    } else {
      target[key] = value;
      changedEntries[key] = value;
    }
  });

  return changedEntries;
}
