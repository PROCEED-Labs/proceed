const { getPredicateForParam } = require('../objectParser/getParameters');

const { NotFoundError } = require('../../error/notFoundError');

/**
 * @module validateParameterDescriptions
 * @memberof module:@proceed/capabilities.module:parser.module:validator
 */

/**
  A Function that validates the parameter descriptions format.
  The function throws NotFoundError in case there is a constraint violation with parameter
  description format
  @param {array} expectedParameters
  @param {array} paraDescriptions
  @param {string} predicateUri
*/
function validateParameterDesc(expectedParameters, paraDescriptions, predicateUri, paramUri) {
  const reminder = 'please have a look to documentation!';
  if (expectedParameters.length !== paraDescriptions.length) {
    throw new NotFoundError(
      `You should include a semantic description for EVERY PARAMETER!, ${reminder}`,
    );
  }
  const params = paraDescriptions.map((desc) => getPredicateForParam(desc, paramUri, predicateUri));
  if (params.length !== expectedParameters.length) {
    throw new NotFoundError(
      `You should include a PREDICATE or a TYPE for EVERY PARAMETER DESCRIPTION!, ${reminder}
        eg:
        {
          "@id": "_:heightParameter",
          "fno:predicate": [{"@type": "schema:height"}],
          "@type": ["fno:Parameter", "schema:Integer"],
          "schema:unitText": "px",
          "fno:required": true
        }
        or
        {
          "@id": "_:heightParameter",
          "@type": ["fno:Parameter", "schema:Integer", "schema:height"],
          "schema:unitText": "px",
          "fno:required": true
        }`,
    );
  }
}

module.exports = validateParameterDesc;
