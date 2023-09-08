const _ = require('lodash');

const { NotFoundError } = require('../error/notFoundError');
const parseHttpAndReplaceHash = require('./urlParser');
const extractValue = require('./objectParser/extractValue');
const mergeRecursively = require('./objectParser/insertAndMergeRecursively');
const objectDeepKeys = require('./objectParser/objectDeepKeys');
const findObjectByKeyVal = require('./objectParser/findObjectByKeyVal');
const replaceKeysOfReturnObject = require('./objectParser/replaceKeysOfReturnObject');
const validateExpectedParametersNode = require('./validator/validateExpectedParametersNode');
const getParameters = require('./objectParser/getParameters');
const validateParameterDesc = require('./validator/validateParameterDescriptions');
const validateParameterMapping = require('./validator/validateParameterMapping');
const validateOutputMapping = require('./validator/validateOutputMapping');

const parameterUri = 'https://w3id.org/function/ontology#Parameter';
const functionParamMappingUri = 'https://w3id.org/function/vocabulary/mapping#functionParameter';
const predicateUri = 'https://w3id.org/function/ontology#predicate';
const hasPartUri = 'http://purl.org/dc/terms/hasPart';
const implementationUri = 'https://w3id.org/function/vocabulary/mapping#implementationProperty';
const requiredUri = 'https://w3id.org/function/ontology#required';
const unitTextUri = 'https://schema.org/unitText';
const encodingFormatUri = 'https://schema.org/encodingFormat';
const minValueUri = 'https://schema.org/minValue';
const maxValueUri = 'https://schema.org/maxValue';
const mappingUri = 'https://w3id.org/function/ontology#Mapping';
const returnMappingUri = 'https://w3id.org/function/ontology#returnMapping';
const outputUri = 'https://w3id.org/function/ontology#Output';
const expectedArgumentUri = 'https://w3id.org/function/ontology#expects';
const paramMappingUri = 'https://w3id.org/function/ontology#parameterMapping';

/**
 * @module parser
 * @memberof module:@proceed/capabilities
 */

/**
 * @module parameterAndOutputParser
 * @memberof module:@proceed/capabilities.module:parser
 */

/**
  A Function that parses the URI do its domain and actions form
  @param {object} parameterMapping
  @param {object} expectedArg
  @returns {object} corresponding function parameter mapping of the expected
  argument
*/
function findMapping(parameterMapping, expectedArg) {
  const mapping = parameterMapping.find((i) => {
    let fParam = i[functionParamMappingUri];
    if (typeof fParam === 'object' && fParam.length === 1) {
      fParam = fParam.find((e) => e['@value'])['@value'];
    } else {
      return false;
    }
    return fParam === expectedArg['@id'];
  });
  return mapping;
}

/**
  A function that matches the expected arguments with the given arguments using
  parameter mapping und parameter description in expanded jsonld the semantic description
  If there is a unit or encoding Format is given, the check is also made here.
  @param {string} expectedArg given in the semantic description of the capabilities
  @param {array} parameterMapping the expanded jsonld node of parameterMapping in the
  semantic description where
  the parameter description and native function parameter are mapped
  @param {array} parameterDescriptions the expanded jsonld semantic description node
  of the parameter
   @returns {list} the native function parameter and the value
*/
function parseParamRecursively(expectedArg, parameterMapping, parameterDescriptions, args) {
  if (args === undefined) {
    return [];
  }
  const parsedArgs = {};
  for (const key of Object.keys(args)) {
    if (key.startsWith('http')) {
      parsedArgs[parseHttpAndReplaceHash(key)] = args[key];
    } else {
      parsedArgs[key] = args[key];
    }
  }
  const mapping = findMapping(parameterMapping, expectedArg);
  const paramDescription = parameterDescriptions.find(
    (i) => i['@id'] === expectedArg['@id'] || i['@id'] === expectedArg,
  );
  const predicate = getParameters.getPredicateForParam(
    paramDescription,
    parameterUri,
    predicateUri,
  );
  let value = extractValue(parsedArgs, predicate);
  if (paramDescription[hasPartUri] !== undefined) {
    let collectedValues = [];
    const childParamMappings = parameterMapping
      .filter((p) => {
        const paramName = p[functionParamMappingUri];
        return paramName[0]['@value'] === expectedArg['@id'];
      })
      .map((p) => ({
        ...p,
        'https://w3id.org/function/vocabulary/mapping#functionParameter':
          p[functionParamMappingUri].slice(1),
      }));
    const objectGraph = paramDescription[hasPartUri].find((e) => e['@list'])['@list'];
    for (const childParam of objectGraph) {
      collectedValues = collectedValues.concat(
        parseParamRecursively(childParam, childParamMappings, objectGraph, value),
      );
    }
    return collectedValues;
  }
  if (paramDescription[requiredUri][0]['@value'] && value === undefined) {
    throw new NotFoundError(
      'Required parameters should be included in the startCapability function',
    );
  }
  if (value !== undefined) {
    if (paramDescription[unitTextUri] !== undefined && value.unit !== undefined) {
      if (paramDescription[unitTextUri][0]['@value'] !== value.unit) {
        throw new NotFoundError(
          'The unit of the parameter is not correct, please check the semantic description!',
        );
      }
    }
    if (value.unit !== undefined) {
      // eslint-disable-next-line prefer-destructuring
      value = value.value;
    }
  }
  if (value !== undefined) {
    if (paramDescription[encodingFormatUri] !== undefined && value.encodingFormat !== undefined) {
      if (paramDescription[encodingFormatUri][0]['@value'] !== value.encodingFormat) {
        throw new NotFoundError(
          'The encoding format of the parameter is not correct, please check the semantic description!',
        );
      }
    }
    if (value.encodingFormat !== undefined) {
      // eslint-disable-next-line prefer-destructuring
      value = value.value;
    }
  }
  if (value !== undefined) {
    if (paramDescription[minValueUri] !== undefined) {
      const minValue = paramDescription[minValueUri][0]['@value'];
      if (value < minValue) {
        throw new NotFoundError(
          'The value that you provided is smaller then the minimum value, please check the semantic description!',
        );
      }
    }
  }

  if (value !== undefined) {
    if (paramDescription[maxValueUri] !== undefined) {
      const maxValue = paramDescription[maxValueUri][0]['@value'];
      if (value > maxValue) {
        throw new NotFoundError(
          'The value that you provided is bigger then the maximum value, please check the semantic description!',
        );
      }
    }
  }

  const returnItem = {};
  const implementationProperty = mapping[implementationUri].find((e) => e['@value'])['@value'];
  returnItem[implementationProperty] = value;
  return [returnItem];
}

/**
  A Function that parses the arguments in order them to bring expected arguments into
  their native function call
  @param {object} args
  @param {array} expanded jsonld list of semantic description
  @returns {object} cleanedMappedArgObject with the native function call arguments and their values
*/
function parseArguments(args, expanded) {
  const expectedParametersNode = expanded.find((item) => item[expectedArgumentUri] !== undefined);
  validateExpectedParametersNode(expectedParametersNode, expectedArgumentUri);
  const expectedParameters = _.flatten(
    expectedParametersNode[expectedArgumentUri].map((item) => item['@list']),
  );
  if (expectedParameters.length === 0) {
    return {};
  }
  // parameter descriptions in the semantic description
  const parameterDescriptions = _.flatten(
    expectedParameters.map((parameter) =>
      expanded.filter((expandedItem) => expandedItem['@id'] === parameter['@id']),
    ),
  );
  validateParameterDesc(expectedParameters, parameterDescriptions, predicateUri, parameterUri);
  validateParameterMapping(expanded, paramMappingUri, functionParamMappingUri, implementationUri);
  // parameter mapping used for native functions in the semantic description
  const paramMapping = expanded
    .filter((expandedItem) => expandedItem[paramMappingUri] !== undefined)
    .find((i) => i[paramMappingUri])[paramMappingUri];
  let mappedArgs = [];
  for (const expectedArg of expectedParameters) {
    // try to translate given args to parameter as described in parameterMapping
    mappedArgs = mappedArgs.concat(
      parseParamRecursively(expectedArg, paramMapping, parameterDescriptions, args),
    );
  }

  const mappedArgObject = mappedArgs.reduce(mergeRecursively, {});
  const cleanedMappedArgObject = _.pickBy(mappedArgObject, (v) => v !== undefined);
  return cleanedMappedArgObject;
}

/**
  A recursive helper Function that gets iterates over the expanded JSONLD
  process and capability lists and returns all the parameters
  @param {list} expandedJSONLD
  @param {boolean} requiredOnly if true, returns only the required parameters, otherwise returns all
  @returns {params} required parameters in a non-compacted and non-flattened form
*/
function getParamsRecursively(item, requiredOnly) {
  let childParams = [];
  if (item[hasPartUri]) {
    _.head(item[hasPartUri])['@list'].forEach((listItem) => {
      childParams = childParams.concat(getParamsRecursively(listItem, requiredOnly));
    });
  }
  if (item[requiredUri] && (_.head(item[requiredUri])['@value'] === true || !requiredOnly)) {
    let predicate;
    try {
      predicate = item[predicateUri][0]['@type'][0];
    } catch (e) {
      predicate = getParameters.getPredicateFromType(item['@type'], parameterUri)[0];
    }
    return [[predicate], childParams];
  }
  return null;
}

/**
  A Function that gets all the parameters of the given expanded list
  their native function call
  @param {list} expandedJSONLD
  @param {boolean} requiredOnly if true, returns only the required parameters, otherwise returns all
  @returns {params} all parameters
*/
function getParams(expandedJSONLD, requiredOnly) {
  let params = [];
  expandedJSONLD.forEach((item) => {
    params = _.compact(_.flatten(params.concat(getParamsRecursively(item, requiredOnly))));
  });
  return params;
}

/**
  A recursive helper Function that gets iterates over output description
  @param {list} outputDescription
  @returns {params} output parameters
*/

function getOutputParams(outputDescription) {
  let params = [];
  if (outputDescription[hasPartUri]) {
    _.head(outputDescription[hasPartUri])['@list'].forEach((item) => {
      params = params.concat(getOutputParams(item));
    });
  }
  const outputPredicate = getParameters.getPredicateForParam(
    outputDescription,
    outputUri,
    predicateUri,
  );
  params.push(outputPredicate);
  return params;
}

/**
  A Function that checks if the output object of the capability list
  of the engine includes the parameters that are needed for the process
  @param {list} expandedProcessDesc
  @param {list} expandedCapObject
  @returns {boolean}
*/
function checkOutput(expandedProcessDesc, expandedCapObject) {
  const outputProcess = expandedProcessDesc.filter(
    (i) => i['@type'] && _.head(i['@type']) === outputUri,
  );
  const outputMachine = expandedCapObject.filter(
    (i) => i['@type'] && _.head(i['@type']) === outputUri,
  );
  if (outputProcess.length === 0 && outputMachine.length === 0) {
    return true;
  }
  const outputProcesParams = _.flatten(getOutputParams(_.head(outputProcess)));
  const outputMachineParams = _.flatten(getOutputParams(_.head(outputMachine)));
  return _.difference(outputProcesParams, outputMachineParams).length === 0;
}

/**
  A Function that parses the output of the native function in order to bring
  the output object into its absract format
  @param {array} expanded
  @param {object} outputObject
  @returns {object} object with its absract format and values
*/
function parseOutput(expanded, outputObject) {
  if (outputObject === undefined) {
    return null;
  }
  const deepKeys = objectDeepKeys(outputObject).map((key) => key.replace(/\./, '/'));
  const mappingNode = expanded.find((item) => item['@type'] && item['@type'].includes(mappingUri));
  if (mappingNode[returnMappingUri] === undefined) {
    return null;
  }
  validateOutputMapping(mappingNode, returnMappingUri, implementationUri, functionParamMappingUri);
  const root = _.flatten(mappingNode[returnMappingUri].map((i) => i[implementationUri])).find(
    (value) => !value['@value'].includes('/'),
  )['@value'];
  const prependedKeys = deepKeys.map((key) => `${root}/${key}`);
  const parameters = mappingNode[returnMappingUri];
  const functionParameters = prependedKeys
    .map((param) =>
      parameters.find((returnItem) =>
        returnItem[implementationUri].find((item) => item['@value'] === param),
      ),
    )
    .map((defaultReturnMapping) => {
      const functionParameter = defaultReturnMapping[functionParamMappingUri].pop()['@value'];
      const paramCouple = {};
      paramCouple[
        defaultReturnMapping[implementationUri].find((item) => item['@value'])['@value']
      ] = functionParameter;
      return paramCouple;
    });
  const outputNode = expanded.find(
    (expandedItem) => expandedItem['@type'] && expandedItem['@type'].includes(outputUri),
  );
  const params = _.flatten(getOutputParams(outputNode));
  if (params.includes(undefined)) {
    throw new NotFoundError(
      `PLEASE CHECK YOUR OUTPUT NODE DESCRIPTION, type of parameter cannot be parsed!
      The following output node does not have the right format: ${JSON.stringify(outputNode)}`,
    );
  }
  const mappedReturnParameters = functionParameters.map((functionParameter) => {
    const mappedParameter = {};
    const idToSearch = Object.values(functionParameter)[0];
    const result = findObjectByKeyVal(outputNode, '@id', idToSearch);
    let predicate = '';
    try {
      predicate = result[predicateUri][0]['@type'][0].split('/').pop();
    } catch (e) {
      predicate = getParameters
        .getPredicateFromType(result['@type'], outputUri)[0]
        .split('/')
        .pop();
    }
    mappedParameter[Object.keys(functionParameter)[0].split('/').pop()] = predicate;
    return mappedParameter;
  });
  return replaceKeysOfReturnObject(outputObject, mappedReturnParameters);
}

module.exports = {
  findMapping,
  parseParamRecursively,
  parseOutput,
  parseArguments,
  getParams,
  checkOutput,
};
