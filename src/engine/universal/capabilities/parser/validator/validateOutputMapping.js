const _ = require('lodash');
const { NotFoundError } = require('../../error/notFoundError');

const reminder = 'please have a look to documentation!';

/**
 * @module validateOutputMapping
 * @memberof module:@proceed/capabilities.module:parser.module:validator
 */

/**
  A Function that validates the return mapping.
  Throws an error in case there is a violation with the return mapping format
  @param {object} mappingNode
  @param {String} returnMappingUri
  @param {string} implementationUri
  @param {string} functionParamMappingUri
*/
function validateReturnMapping(
  mappingNode,
  returnMappingUri,
  implementationUri,
  functionParamMappingUri
) {
  const returnKeys = _.flatten(mappingNode[returnMappingUri].map((i) => i[implementationUri]));
  if (returnKeys.includes(undefined)) {
    throw new NotFoundError(
      `You should ALWAYS INCLUDE THE IMPLEMENTATION PROPERTY OF THE RETURN OBJECT!, ${reminder}
        eg:
        "fno:returnMapping": [
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": "_:imageParameter",
          "fnom:implementatillonProperty": "img"
        },
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": [
            "_:imageParameter",
            "_:geoCoordinatesParameter"
          ],
          "fnom:implementationProperty": "img/gps"
        }]`
    );
  }
  const funtionParamMappings = _.flatten(
    mappingNode[returnMappingUri].map((i) => i[functionParamMappingUri])
  );
  if (funtionParamMappings.includes(undefined)) {
    throw new NotFoundError(
      `You should ALWAYS INCLUDE THE function parameter of the return object!, ${reminder}
        If you have a complex object, then the child keys must be seperated with a '/'
        as in the example for describing the implementation property.
        eg:
        "fno:returnMapping": [
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": "_:imageParameter",
          "fnom:implementatillonProperty": "img"
        },
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": [
            "_:imageParameter",
            "_:geoCoordinatesParameter"
          ],
          "fnom:implementationProperty": "img/gps"
        }]`
    );
  }
}

module.exports = validateReturnMapping;
