const jsonld = require('jsonld');
const { NotFoundError } = require('../../error/notFoundError');

/**
 * @module listParser
 * @memberof module:@proceed/capabilities.module:parser.module:listParser
 */

/**
 * @function
  A Function that creates the expanded version of the given capability list,
  it uses jsonld library and creates an JSON-LD object which removes the context of
  the compacted version and creates an expanded list with URIs
  throws a NotFoundError if '@graph' keyword is not found
  @param {list} capabilityList
  @returns {list} expanded list and its identifier
*/
module.exports = (capabilityList) =>
  capabilityList.map(async (capabilityItem) => {
    if (capabilityItem.semanticDescription['@graph']) {
      const context = capabilityItem.semanticDescription['@context'];
      const doc = capabilityItem.semanticDescription['@graph'];
      const compacted = await jsonld.compact(doc, context);
      const expanded = await jsonld.expand(compacted);
      return { expanded, identifier: capabilityItem.identifier };
    }
    throw new NotFoundError(
      "You should ALWAYS include a graph and name your node as '@graph', please have a look to previous examples!"
    );
  });
