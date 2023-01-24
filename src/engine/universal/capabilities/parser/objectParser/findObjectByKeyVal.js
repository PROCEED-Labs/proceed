/**
 * @module findObjectByKeyVal
 * @memberof module:@proceed/capabilities.module:parser.module:objectParser
 */

/**
  A recursive function that finds all the corresponding key value pairs
  and returns to object having the key-value pair
  @param {obj} obj a Javascript object
  @param {key} key requested key
  @param {val} value requested value
  @returns found object with the requested key value pair
*/
function findObjectByKeyVal(obj, key, val) {
  if (!obj || typeof obj === 'string') {
    return null;
  }
  if (obj[key] === val) {
    return obj;
  }

  for (const i in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(i)) {
      const found = findObjectByKeyVal(obj[i], key, val);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

module.exports = findObjectByKeyVal;
