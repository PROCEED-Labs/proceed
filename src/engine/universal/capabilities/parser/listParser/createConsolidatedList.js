const jsonld = require('jsonld');

/**
 * @module listParser
 * @memberof module:@proceed/capabilities.module:parser
 */

/**
 * @module createConsolidatedList
 * @memberof module:@proceed/capabilities.module:parser.module:listParser
 */

/**
  A Function that creates the consolidated list by using a jsonld library
  @param {list} capabilityList
  @returns {object} compacted and consolidated list for the capabilities
  endpoint
  note: of the predicate (type of the semantic description is without an URI (eg: 'rotation',
  the library parses it with '/'s eg: '/rotation')
*/
async function createConsolidatedList(capabilityList) {
  if (capabilityList.length === 0) {
    return 'There is no capability list for this engine!';
  }
  const context = capabilityList[0].semanticDescription['@context'];
  const doc = capabilityList
    .map((capabilityItem) => capabilityItem.semanticDescription['@graph'])
    .reduce((a, b) => a.concat(b));
  const compacted = await jsonld.compact(doc, context);
  const consolidatedGraph = compacted['@graph']
    .filter(
      (graphItem) =>
        !(typeof graphItem['@type'] === 'string' && graphItem['@type'].includes('Mapping')),
    )
    .filter((graphItem) => !graphItem['@id'].includes('Implementation'));
  const consolidatedList = await jsonld.compact(consolidatedGraph, context);
  return consolidatedList;
}

module.exports = createConsolidatedList;
