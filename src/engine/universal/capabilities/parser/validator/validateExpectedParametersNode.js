const _ = require('lodash');
const { NotFoundError } = require('../../error/notFoundError');

/**
 * @module validator
 * @memberof module:@proceed/capabilities.module:parser
 */

/**
 * @module validateExpectedParametersNode
 * @memberof module:@proceed/capabilities.module:parser.module:validator
 */

/**
  A Function that validates the expected parameters format. The expected parameters should
  always be used with the Function Ontology expectedArgumentUri and '@list' keyword.
  The function throws NotFoundError in case there is a constraint violation with the format
  @param {object} expectedParametersNode
  @param {string} expectedArgumentUri
*/
function validateParameterFormat(expectedParametersNode, expectedArgumentUri) {
  const reminder = 'please have a look to documentation!';
  if (_.isEmpty(expectedParametersNode)) {
    throw new NotFoundError(
      `You should include the expected parameters, eg: "fno:expects": {
            "@list": [
              { "@id": "_:heightParameter" },
              { "@id": "_:widthParameter" },
              { "@id": "_:dpiParameter" },
              { "@id": "_:optionsParameters" }
            ]
          },

          If there is no expected parameter, you should at least provide an empty array, eg: "fno:expects": {"@list": []} ,${reminder}`,
    );
  }
  const expectedParametersList = expectedParametersNode[expectedArgumentUri].find(
    (item) => item['@list'],
  );
  if (_.isEmpty(expectedParametersList)) {
    throw new NotFoundError(
      `You should include the expected parameters using the JSONLD keyword '@list'!!!!!
        eg: "fno:expects": {
            "@list": [
              { "@id": "_:heightParameter" },
              { "@id": "_:widthParameter" },
              { "@id": "_:dpiParameter" },
              { "@id": "_:optionsParameters" }
            ]
          }, If there is no expected parameter, you should provide an empty array eg: "fno:expects": {"@list": []} ,${reminder}`,
    );
  }
}

module.exports = validateParameterFormat;
