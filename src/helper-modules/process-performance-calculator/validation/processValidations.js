const { validateElement } = require('./elementValidations');
const { validateProcessStructure } = require('./structureValidations');

/**Function that checks whether a process was modeled "correctly" so that it can be extracted for performance calculation (wrapper)
 *
 * @param {Object} processes [mainProcess: bpmn, calledProcesses: [{processes}]] in bpmn moddle object format
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Array} validation results [{ processId, validationPassed, problems, validatedElements, gateways }] (for each included process in main)
 */
function validateProcess(processes, settings) {
  const main = processes.mainProcess;
  const called = processes.calledProcesses || [];

  const validationResult = main.rootElements
    .filter(
      (elem) => elem.$type.includes('Process'), //not sure if filtering is actually necessary here
    )
    .map((processRoot) => {
      const processVal = {
        processId: processRoot.id,
        validationPassed: true,
        problems: [],
        validatedElements: [],
        gateways: [],
      };
      const problems = [];

      const flowElements = processRoot.flowElements;
      const validationObj = validateProcessElements(flowElements, settings, called);
      if (validationObj.provisionalValidationPassed == false) {
        processVal.validationPassed = false;
        problems.push(validationObj.problems);
      } else {
        structureValidationObj = validateProcessStructure(flowElements);
        if (structureValidationObj.structureValidationPassed == false) {
          processVal.validationPassed = false;
          problems.push(structureValidationObj.problems);
        } else {
          processVal.gateways = structureValidationObj.gateways;
          processVal.validatedElements = validationObj.validatedElements;
        }
      }
      processVal.problems = problems.flat();

      return processVal;
    });

  return validationResult;
}

/**Function that checks whether an array of flow elements was modeled "correctly" and builds an array of validated elements
 *
 * @param {Array} flowElements in the main process that is being evaluated
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @param {Array} called process objects of the processes that are called by the main process: [{mainProcess: bpmn, calledProcesses: [{...}]}]
 * @returns {Object} validation result: { provisionalValidationPassed, problems, validatedElements}
 * problems: [{id: 'id...' or 'none', problem: 'problem description'}]
 * validatedElements: contains the original elements as well as potentially nested gateways and validated elements -> relevant for call activities and subprocesses
 */
function validateProcessElements(flowElements, settings, called) {
  const validationResult = {
    provisionalValidationPassed: true,
    problems: [], //[{id: 'id...' or 'none', problem: 'problem description'}]
    validatedElements: [],
  };

  //process rules:

  //exactly one start and one end event
  const startAndEndEvents = ['StartEvent', 'EndEvent'];
  startAndEndEvents.map((elem) => {
    let eventName = elem;
    const events = flowElements.filter((elem) => elem.$type.includes(eventName));
    if (events.length == 0) {
      validationResult.provisionalValidationPassed = false;
      if (eventName == 'StartEvent') {
        validationResult.problems.push({ id: 'none', problem: 'Start event is required.' });
      } else validationResult.problems.push({ id: 'none', problem: 'End event is required.' });
    } else if (events.length > 1) {
      validationResult.provisionalValidationPassed = false;
      events.forEach((el) => {
        if (eventName == 'StartEvent') {
          validationResult.problems.push({
            id: el.id,
            problem: 'Only one start event is allowed.',
          });
        } else {
          validationResult.problems.push({
            id: el.id,
            problem: 'Only one end event is allowed.',
          });
        }
      });
    }
  });

  const validatedElements = flowElements.map((elem) => {
    let elementValidation = validateElement(elem, settings);
    let passed = elementValidation.passed;
    const problems = elementValidation.problems;

    if (elem.$type.includes('CallActivity')) {
      elem.gateways = [];
      elem.validatedElements = [];
      if (passed == true && settings.overwriteWithParentPerformance == false) {
        //find called process
        let calledProcessId = elem.calledElement; //this id does not have bpmn in the front, so an exact match is impossible
        const calledProcessObj = called.find((elem) =>
          calledProcessId.includes(elem.mainProcess.rootElements[0].id),
        );
        if (!calledProcessObj) {
          passed = false;
          problems.push({
            id: elem.id,
            problem: 'Could not find a matching called process.',
          });
        } else {
          const callValidation = validateProcess(calledProcessObj, settings); //validation of called process
          if (callValidation[0].validationPassed == false) {
            passed = false;
            problems.push({
              id: elem.id,
              problem:
                'The called process has incorrect content or structure, specifics are provided separately.',
            });
            problems.push(callValidation[0].problems);
          } else {
            elem.gateways = callValidation[0].gateways;
            elem.validatedElements = callValidation[0].validatedElements;
          }
        }
      }
    } else if (elem.$type.includes('SubProcess')) {
      elem.gateways = [];
      elem.validatedElements = [];
      if (passed == true && settings.overwriteWithParentPerformance == false) {
        const subValidation = validateProcessElements(elem.flowElements, settings, called); //validation of nested sub process elements
        if (subValidation.provisionalValidationPassed == false) {
          passed = false;
          problems.push({
            id: elem.id,
            problem: 'The subprocess has incorrect content, specifics are provided separately.',
          });
          problems.push(subValidation.problems);
        } else {
          const subStructureValidation = validateProcessStructure(elem.flowElements);
          if (subStructureValidation.structureValidationPassed == false) {
            passed = false;
            problems.push({
              id: elem.id,
              problem:
                'The subprocess is structured incorrectly, specifics are provided separately.',
            });
            problems.push(subStructureValidation.problems);
          } else {
            elem.gateways = subStructureValidation.gateways;
            elem.validatedElements = subValidation.validatedElements;
          }
        }
      }
    }

    if (passed == false) {
      validationResult.provisionalValidationPassed = false;
      const finalProblems = problems.flat();
      finalProblems.forEach((elem) => validationResult.problems.push(elem));
    }

    return elem;
  });

  if (validationResult.provisionalValidationPassed == true) {
    validationResult.validatedElements = validatedElements;
  }

  return validationResult;
}

module.exports = {
  validateProcess,
};
