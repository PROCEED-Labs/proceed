/**
 * @module objectParser
 * @memberof module:@proceed/capabilities.module:parser
 */

/**
 * @module compareArrays
 * @memberof module:@proceed/capabilities.module:parser.module:objectParser
 */

/**
 * @function
  A Function that receives two arrays and compares them
  it's not important if the elements in the array are in different
  order
  @param {array} requiredProcessParams
  @param {array} requiredCapObjectParams
  @returns boolean
*/
module.exports = (requiredProcessParams, requiredCapObjectParams) => {
  if (requiredProcessParams.length !== requiredCapObjectParams.length) {
    return false;
  }
  return requiredProcessParams.filter((i) => !requiredCapObjectParams.includes(i)).length === 0;
};
