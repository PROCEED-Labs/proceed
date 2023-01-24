/**
 * @module objectDeepKeys
 * @memberof module:@proceed/capabilities.module:parser.module:objectParser
 */

/**
  A recursive function that returns all the keys of an object
  in the semantic description list
  @param {object} obj a Javascript object
  @returns {array} with all the keys of the object
*/
function objectDeepKeys(obj) {
  return Object.keys(obj)
    .filter((key) => obj[key] instanceof Object)
    .map((key) => objectDeepKeys(obj[key]).map((k) => `${key}.${k}`))
    .reduce((x, y) => x.concat(y), Object.keys(obj));
}

module.exports = objectDeepKeys;
