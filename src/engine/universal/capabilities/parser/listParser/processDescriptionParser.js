const jsonld = require('jsonld');

/**
 * @module processDescriptionParser
 * @memberof module:@proceed/capabilities.module:parser.module:listParser
 */

/**
 * @function
 * A Function that creates the expanded version of the given capability list,
 * it uses jsonld parser and creates an JSON-LD object which removes the context of
 * the compacted version and created a expanded list with URIs
 * throws a NotFoundError if '@graph' keyword is not found
 * @param {list} capabilityList
 * @returns {list} expanded list and its identifier
 */
module.exports = async (processDescription) => {
  const context = processDescription['@context'];
  const doc = processDescription['@graph'];
  const compacted = await jsonld.compact(doc, context);
  const expanded = await jsonld.expand(compacted);
  return expanded;
};
