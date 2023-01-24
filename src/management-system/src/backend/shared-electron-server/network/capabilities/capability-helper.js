import createExpandedList from '@proceed/capabilities/parser/listParser/processDescriptionParser.js';
import getPotentialActionsEx from '@proceed/capabilities/parser/potentialActionParser.js';
const { getPotentialActions } = getPotentialActionsEx;
import getPredicateForParamEx from '@proceed/capabilities/parser/objectParser/getParameters.js';
const { getPredicateForParam } = getPredicateForParamEx;

/**
 * a function that parses information about the parameter from the list
 *
 * @param {string} id id of the related parameter node
 * @param {object} expandedList list to search in
 */
export function getParameterInfo(id, list) {
  const parameterNode = list.find((el) => el['@id'] === id);

  const keys = Object.keys(parameterNode);

  const parameterObject = {};

  [parameterObject.schema] = getPredicateForParam(
    parameterNode,
    'https://w3id.org/function/ontology#Parameter',
    'https://w3id.org/function/ontology#predicate'
  );
  parameterObject.name = parameterObject.schema.split('/').pop();

  const [paramOrOutput, type] = parameterNode['@type'];
  if (type) {
    parameterObject.type = type;
  }

  // small helpers to reduce redundant code
  const getNodeWithSubstring = (subString) =>
    parameterNode[keys.find((key) => key.includes(subString))];
  const getValue = (node) => node[0]['@value'];

  const validators = [];

  const maxValueNode = getNodeWithSubstring('maxValue');
  if (maxValueNode) {
    const validator = { type: 'max' };
    validator.rule = getValue(maxValueNode);
    validators.push(validator);
  }

  const minValueNode = getNodeWithSubstring('minValue');
  if (minValueNode) {
    const validator = { type: 'min' };
    validator.rule = getValue(minValueNode);
    validators.push(validator);
  }

  parameterObject.validators = validators;

  const defaultValueNode = getNodeWithSubstring('defaultValue');
  if (defaultValueNode) {
    parameterObject.default = getValue(defaultValueNode);
  }

  if (/Parameter$/.test(paramOrOutput)) {
    parameterObject.required = getValue(getNodeWithSubstring('required'));
  }

  const unitNode = getNodeWithSubstring('unit');
  if (unitNode) {
    parameterObject.unit = getValue(unitNode);
  }

  const encodingNode = getNodeWithSubstring('encoding');
  if (encodingNode) {
    parameterObject.encoding = getValue(encodingNode);
  }

  const descriptionNode = getNodeWithSubstring('description');
  if (descriptionNode) {
    parameterObject.description = getValue(descriptionNode);
  }

  const subTypes = [];
  const hasPart = keys.find((key) => /hasPart$/.test(key));
  if (hasPart) {
    const subNodes = parameterNode[hasPart][0]['@list'];
    subNodes.forEach((node) => {
      subTypes.push(getParameterInfo(node['@id'], subNodes));
    });

    parameterObject.subTypes = subTypes;
  }

  return parameterObject;
}

export function getCapabilityInfo(action, expandedList) {
  const capability = { schema: action.uri };

  capability.name = action.uri.split('/').pop();
  const [definition] = expandedList.filter((el) => el['@id'].includes(action.id));
  let params = [];
  let returnVals = [];
  Object.keys(definition).forEach((key) => {
    if (key.includes('expects')) {
      params = definition[key][0]['@list'];
    }

    if (key.includes('returns')) {
      returnVals = definition[key][0]['@list'];
    }
  });

  capability.parameters = [];
  capability.returnValues = [];

  params.forEach((param) => {
    capability.parameters.push(getParameterInfo(param['@id'], expandedList));
  });

  returnVals.forEach((returnVal) => {
    capability.returnValues.push(getParameterInfo(returnVal['@id'], expandedList));
  });

  return capability;
}

/**
 *
 * @param {object} the capability description gotten from an engine in form of an object
 * @returns {} - the capability information as needed by the ms
 */
export async function convertSemanticDescription(semanticObject) {
  const expandedList = await createExpandedList(semanticObject);
  const potentialActionURIs = getPotentialActions(expandedList);

  const potentialActions = expandedList
    // get elements that contain information which potential actions exist
    .filter((el) => Object.keys(el).some((key) => key.includes('potentialAction')))
    //get key and uri from these elements
    .map((el) => {
      const potentialActionInformationKey = Object.keys(el).find((key) =>
        key.includes('potentialAction')
      );
      const [potentialActionInformation] = el[potentialActionInformationKey];
      const potentialAction = { id: potentialActionInformation['@id'] };

      potentialAction.uri = potentialActionInformation['@type'].find((uri) =>
        potentialActionURIs.includes(uri)
      );

      return potentialAction;
    });

  const capabilities = [];

  potentialActions.forEach((action) => {
    capabilities.push(getCapabilityInfo(action, expandedList));
  });

  return capabilities;
}
