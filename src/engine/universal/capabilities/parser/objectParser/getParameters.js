const typeList = require('../typeList');

/**
 * @module getParameters
 * @memberof module:@proceed/capabilities.module:parser.module:objectParser
 */

/**
  Type of the parameter (the semantic description of the parameter) can occur in
  Function Ontology predicate keyword as `fno:predicate` or in with `@type`
  keyword, this function extracts the type of the parameter (eg: 'https://schema.org/height')
  when type of the parameter  given with '@types' keyword
  @param {array} types
  @param {string} uri
  @returns predicate (type of the parameter)
*/
function getPredicateFromType(types, uri) {
  let predicate = '';
  predicate = types.find((type) => typeList.find((t) => t === type) === undefined && type !== uri);
  predicate = [predicate];
  return predicate;
}

/**
  This function extracts the type of the parameter (eg: 'https://schema.org/height')
  from a parameter node, the type of the parameter can occur either with `fno:predicate`
  keyword or with `@type` keyword, this function checks both cases and extracts the type
  of the parameter as an array (eg:[ 'https://schema.org/latidute' ] or ['/rotation' ])
  @param {object} paramDescription node
  @param {string} uri
  @param {string} predicateUri
  @returns an array the predicate (type of the parameter)
*/
function getPredicateForParam(paramDescription, uri, predicateUri) {
  let predicate = '';
  try {
    predicate = paramDescription[predicateUri][0]['@type'];
  } catch (e) {
    predicate = getPredicateFromType(paramDescription['@type'], uri);
  }
  return predicate;
}

module.exports = { getPredicateForParam, getPredicateFromType };
