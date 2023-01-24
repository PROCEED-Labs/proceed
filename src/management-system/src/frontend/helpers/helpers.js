/**
 * @module helpers
 */

/**
 * @module misc
 * @memberof module:helpers
 */

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
function deepEquals(a, b) {
  // early exit if types don't match
  if (typeof a !== typeof b) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    let index = 0;
    // can't break early from forEach
    for (let value of a) {
      // recursively compare the values from both arrays
      if (!deepEquals(value, b[index])) {
        return false;
      }
      ++index;
    }

    return true;
  }

  // the values to compare are not arrays but might be objects
  if (typeof a === 'object' && a !== null && b !== null) {
    let aKeys = Object.keys(a);
    let bKeys = Object.keys(b);
    // objects can't be equal with differing keys
    if (aKeys.length !== bKeys.length || aKeys.some((key) => !bKeys.includes(key))) {
      return false;
    }

    for (let key of aKeys) {
      if (!deepEquals(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return a === b;
}

/**
 * A function that checks if an object or array contains only the entries contained in some other array or object
 *
 * the other object(|array) might contain additional entries
 *
 * (set doesn't mean that the arrays can contain a value only once in this case)
 *
 * @param {Object|Array} set the object or array we want to compare against
 * @param {Object|Array} candidate the object we want to check
 * @returns {Boolean} if the candidate contains only elements of the original object
 * @throws Will throw an error if the two given values are not of the same type or if they are not of the specified type (null is also not allowed)
 */
function isSubset(set, candidate) {
  // we want to only compare object typed values
  if (typeof set !== 'object' || typeof candidate !== 'object') {
    throw new Error(`Expected two objects but got ${typeof set} and ${typeof candidate}`);
  }
  // null has object type so we have to handle it seperately
  if (set === null || candidate === null) {
    throw new Error('Got illegal null value');
  }

  // we don't want to compare arrays with general object
  if (
    (Array.isArray(set) && !Array.isArray(candidate)) ||
    (!Array.isArray(set) && Array.isArray(candidate))
  ) {
    const typeString = (el) => (Array.isArray(el) ? 'array' : 'object');
    throw new Error(
      `Expected both to be either array or object but got ${typeString(set)} and ${typeString(
        candidate
      )}`
    );
  }

  // check if we have to handle an object or array
  if (Array.isArray(set)) {
    // early exit if the candidate is longer than the original set
    if (set.length < candidate.length) {
      return false;
    }

    let index = 0;
    for (let entry of candidate) {
      if (!deepEquals(entry, set[index])) {
        return false;
      }
      ++index;
    }
  } else {
    // check if all keys of the candidate occur in the original object with the same values
    const cKeys = Object.keys(candidate);

    for (let key of cKeys) {
      // check if the original object has the specific key
      if (!set.hasOwnProperty(key)) {
        return false;
      }

      if (!deepEquals(set[key], candidate[key])) {
        return false;
      }
    }

    return true;
  }

  return true;
}

function isObject(candidate) {
  return !!candidate && typeof candidate === 'object' && !Array.isArray(candidate);
}

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
function mergeIntoObject(target, toMerge, deepMerge, noNewValues, typesafe) {
  if (!isObject(target)) {
    throw new Error('Tried to merge into something that is not an object');
  }

  if (!isObject(toMerge)) {
    throw new Error('Tried to merge something that is not an object');
  }

  const changedEntries = {};

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

module.exports = { deepEquals, isSubset, mergeIntoObject };
