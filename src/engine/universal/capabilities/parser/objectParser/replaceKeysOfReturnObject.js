/**
 * @module replaceKeysOfReturnObject
 * @memberof module:@proceed/capabilities.module:parser.module:objectParser
 */

/**
  A recursive function that brings the return result to the required form
  @param {object}
  @param {array}
  @returns {object} the object with keys as in semantic description form with
  their values
*/
function replaceKeysOfReturnObject(item, list) {
  const newItem = {};
  for (const oldKey of Object.keys(item)) {
    const newKey =
      list.find((i) => i[oldKey] !== undefined)[oldKey].split(':')[1] ||
      list.find((i) => i[oldKey] !== undefined)[oldKey];
    if (typeof item[oldKey] === 'object') {
      newItem[newKey] = replaceKeysOfReturnObject(item[oldKey], list);
    } else {
      newItem[newKey] = item[oldKey];
    }
  }
  return newItem;
}

module.exports = replaceKeysOfReturnObject;
