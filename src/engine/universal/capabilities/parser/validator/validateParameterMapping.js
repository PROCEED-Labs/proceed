const _ = require('lodash');

const { NotFoundError } = require('../../error/notFoundError');

const reminder = 'please have a look to documentation!';

/**
 * @module validateParameterMapping
 * @memberof module:@proceed/capabilities.module:parser.module:validator
 */

/**
  A Function that validates the parameter mapping.
  Throws an error in case there is a violation with the parameter mapping format
  @param {array} expanded
  @param {string} paramMappingUri
  @param {string} functionParameterMappingUri
  @param {string} implementationUri
*/
function validateParameterMapping(
  expanded,
  paramMappingUri,
  functionParameterMappingUri,
  implementationUri
) {
  const paramMapping = expanded.filter(
    (expandedItem) => expandedItem[paramMappingUri] !== undefined
  );
  if (paramMapping.length === 0) {
    throw new NotFoundError(
      `You should include a parameter mapping so that a native function can be called!, ${reminder}
      eg:
      "fno:parameterMapping": [
      {
        "@type": "fnom:PropertyParameterMapping",
        "fnom:functionParameter": "_:heightParameter",
        "fnom:implementationProperty": "h"
      },
      {
        "@type": "fnom:PropertyParameterMapping",
        "fnom:functionParameter": "_:widthParameter",
        "fnom:implementationProperty": "w"
      }]`
    );
  }
  const functionParameterMappings = _.flatMap(paramMapping, (i) => i[paramMappingUri]).map(
    (i) => i[functionParameterMappingUri]
  );
  if (functionParameterMappings.includes(undefined)) {
    throw new NotFoundError(
      `You should ALWAYS INCLUDE THE FUNCTION PARAMETER!, ${reminder}
       It should be mapped to the parameter description node.
        eg:
        "fno:parameterMapping": [
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:heightParameter",
          "fnom:implementationProperty": "h"
        },
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:widthParameter",
          "fnom:implementationProperty": "w"
        }]`
    );
  }
  const implementationPropertyMappings = _.flatMap(paramMapping, (i) => i[paramMappingUri]).map(
    (i) => i[implementationUri]
  );
  if (implementationPropertyMappings.includes(undefined)) {
    throw new NotFoundError(
      `You should ALWAYS INCLUDE THE IMPLEMENTATION PROPERTY in the semantic description!, so that
       the native function can be called, ${reminder}!.
       Implementation propery should always be equal to the native function parameter name!
        eg:
        "fno:parameterMapping": [
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:heightParameter",
          "fnom:implementationProperty": "h"
        },
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:widthParameter",
          "fnom:implementationProperty": "w"
        }]`
    );
  }
}

module.exports = validateParameterMapping;
