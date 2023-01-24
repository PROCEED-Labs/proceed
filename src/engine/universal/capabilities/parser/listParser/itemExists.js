const _ = require('lodash');
const createExpandedList = require('../listParser/listParser');
const potentialActionParser = require('../potentialActionParser');

/**
 * @module itemsExists
 * @memberof module:@proceed/capabilities.module:parser.module:listParser
 */

/**
 *
 * A Function that gets a capability list and converts the capability list into
 * its expanded list and returns an array of the potential actions
 * @param {list} capabilityList
 * @returns {array} potential actions of the given capability list
 */
async function getPotentialActionsFromList(capabilityList) {
  const expandedList = await Promise.all(createExpandedList(capabilityList));
  const flattenedList = _.flatten(expandedList.map((capItem) => capItem.expanded));
  return potentialActionParser.getPotentialActions(flattenedList);
}

/**
 * @function
 * A Function that gets a capability list and a capability item
 * and checks if the item is included in the capability list
 * @param {list} capabilityList
 * @param {object} capabilityItem
 * @returns {boolean}
 */
module.exports = async (capabilityItem, capabilityList) => {
  const potentialActions = await Promise.resolve(getPotentialActionsFromList(capabilityList));
  const potentialAction = await Promise.resolve(getPotentialActionsFromList([capabilityItem]));
  if (potentialActions.includes(potentialAction)) {
    return true;
  }
  return false;
};
