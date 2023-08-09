const fs = require('fs');
const path = require('path');
const { getInputAsBpmnObjects, editPerformanceResults } = require('./helper/preAndPostProcessing');
const { validateProcess } = require('./validation/processValidations');
const { extractProcessInfos } = require('./extraction/processExtractions');
const { calculatePerformance } = require('./calculation/processCalculations');

/**Function that analyses a process in order to try to calculate time and cost related process performance parameters
 *
 * @param {Object} processes main process and called processes in xml or bpmn moddle object format: {mainProcess, calledProcesses: [{mainProcess, calledProcesses: [{...}]}]}
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @param {*} instanceInfo CURRENTLY NOT SUPPORTED optional, contains information about the current process instance (i.e. its token(s))
 * @returns {Array} array of objects with performance infos or failure description for each process entity in the main process: [{processId, failed, processPerformance: {elementPerformanceArray, totalPerformance}, problems}]
 */
async function analyseProcessPerformance(processes, settings, instanceInfo) {
  //pre-processing: get all processes in object format
  const processObject = await getInputAsBpmnObjects(processes);
  if (processObject.failed == true) {
    return processObject.result;
  }
  //validations
  const validationResults = validateProcess(processObject.result, settings, instanceInfo);
  //extractions
  const extractionResults = extractProcessInfos(validationResults, settings);
  //performance calculations
  const calculationResults = calculatePerformance(extractionResults, settings);
  //post-processing
  const finalResults = editPerformanceResults(calculationResults, settings);

  console.log(finalResults);
  return finalResults;
}

module.exports = {
  analyseProcessPerformance,
};

/* const settings = {
  calculations: ['time', 'cost', 'dates'], //dates are not really supported yet
  considerPerformanceInSequenceFlows: false,
  overwriteWithParentPerformance: false,
  ignoreMissingBasicPerformance: false,
  ignoreMissingOptionalPerformance: true,
}; */
