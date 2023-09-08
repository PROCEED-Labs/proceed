const _ = require('lodash');

const { NotFoundError } = require('../error/notFoundError');

const listParser = require('./listParser/listParser');

const functionUri = 'https://w3id.org/function/ontology#Function';
const potentialActionUri = 'https://schema.org/potentialAction';

/**
 * @module potentialActionParser
 * @memberof module:@proceed/capabilities.module:parser
 */

/**
  A Function that removed the URI of function from potential action array
  in order to identify the potential action
  @param {array} potentialActionsArray
  @returns {array} clean potentialActionArray
*/
function removeFunctionUri(potentialActionsArray) {
  return _.remove(potentialActionsArray, (e) => e !== functionUri);
}

/**
  A Function that removes the URI of function from potential action array
  in order to identify the potential action
  @param {list} expandedList
  @returns {array} with potentialActions
*/
function getPotentialActions(expandedList) {
  const potentialActionsArray = _.flatMap(
    _.flatMap(expandedList, potentialActionUri).filter((e) => e),
    '@type',
  );
  return removeFunctionUri(potentialActionsArray);
}

/**
  A Function that validates the potential action format of the capability list
  throws an error in case there is a capability item without a potential action
  @param {list} expandedList
  @param {list} capabilityList
*/
function validatePotentialActions(capabilityList, expandedList) {
  const potentialActionNode = [];
  expandedList.forEach((item) =>
    item.expanded.forEach((expandedItem) => {
      if (expandedItem[potentialActionUri]) {
        potentialActionNode.push(expandedItem[potentialActionUri]);
      }
      return potentialActionNode;
    }),
  );
  if (potentialActionNode.length !== capabilityList.length) {
    const reminder = 'please have a look to documentation!';
    throw new NotFoundError(
      `You should include a potential action in the capability list so that the capability can be executed
      eg:
      {
        "@id": "_:capability",
        "odpa:sameSettingAs": "saref:LightingDevice",
        "schema:potentialAction": {
          "@type": ["iotschema:TurnOn", "fno:Function"],
          "@id": "_:TurnOnDefinition"
        }
      }
      ${reminder}`,
    );
  }
}

/**
  A Function that finds the corresponding capability description and id for
  given capability name
  @param {string} capabilityName
  @param {list} capabilityList
  @returns expanded list of the capability list with an identifier
*/
async function findIdAndDesc(capabilityName, capabilityList) {
  const expandedList = await Promise.all(listParser(capabilityList));
  validatePotentialActions(capabilityList, expandedList);
  const capabilityObject = {};
  expandedList.forEach((item) =>
    item.expanded.forEach((expandedItem) => {
      if (expandedItem[potentialActionUri]) {
        return expandedItem[potentialActionUri].map((potentialAction) =>
          potentialAction['@type'].map((potentialActionType) => {
            const splittedUrl =
              potentialActionType.split('/')[potentialActionType.split('/').length - 1];
            if (potentialActionType === capabilityName || splittedUrl === capabilityName) {
              capabilityObject.identifier = item.identifier;
              capabilityObject.expanded = item.expanded;
            }
            return potentialActionType;
          }),
        );
      }
      return expandedItem;
    }),
  );
  return capabilityObject;
}

module.exports = { getPotentialActions, findIdAndDesc, removeFunctionUri };
