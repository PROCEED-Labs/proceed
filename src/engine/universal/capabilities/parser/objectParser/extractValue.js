const parseHttpAndReplaceHash = require('./../urlParser');

/**
 * @module extractValue
 * @memberof module:@proceed/capabilities.module:parser.module:objectParser
 */

/**
 * @function
  A Function that extracts value from given argument object
  @param {object} args
  @param {string} key
  @returns {value} either complex object if the object is nested or
  the value of the given key
*/
module.exports = (args, key) => {
  let predicate = key.find(() => true);
  if (predicate.startsWith('http')) {
    predicate = parseHttpAndReplaceHash(predicate);
  } else {
    predicate = predicate.substring(1);
  }
  if (args[predicate] === false) {
    return false;
  }
  return args[predicate] || args[predicate.split(':')[1]];
};
