/**
 * @module insertAndMergeRecursively
 * @memberof module:@proceed/capabilities.module:parser.module:objectParser
 */

/**
  A Function that brings the parameter and value to required format
  @param {object}
  @param {array}
  @param {*}
   @returns {object} of the parameter and the value pairs
*/
function insertRecursively(merged = {}, keys, value) {
  let mergedValue;
  if (keys.length === 1) {
    if (Object.keys(merged).indexOf(keys[0]) >= 0) {
      throw new Error(`Found multiple values for ${keys[0]}`);
    }
    mergedValue = value;
  } else {
    mergedValue = insertRecursively(merged[keys[0]], keys.slice(1), value);
  }
  const result = { ...merged };
  result[keys[0]] = mergedValue;
  return result;
}

/**
    A Function that merges the arguments to the required form for native function call
    if the parameter is an object, semantic description uses '/' to identify the level
    of the key in an object eg: { 'option/blackwhite': false }
    returns eg: options: { blackWhite: false} }
    @param {object}
    @param {object}
    @returns {object}
  */
function changeForNativeExecution(a, b) {
  if (a === undefined || b === undefined) {
    return a || b;
  }
  let merged = {};
  for (const key of Object.keys(a)) {
    merged = insertRecursively(merged, key.split('/'), a[key]);
  }
  for (const key of Object.keys(b)) {
    merged = insertRecursively(merged, key.split('/'), b[key]);
  }
  return merged;
}

module.exports = changeForNativeExecution;
