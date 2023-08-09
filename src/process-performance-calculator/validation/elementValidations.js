const { getMetaDataFromElement } = require('@proceed/bpmn-helper');
const { validateInAndOut, validateTimeInfo } = require('./validationHelper');

/**Function that checks wether a flow element is supported/allowed and was modeled "correctly"
 *
 * @param {Object} elem bpmn flow element
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateElement(elem, settings) {
  let meta = getMetaDataFromElement(elem);
  let elemVal;
  let passed = true;
  const problems = [];

  if (elem.$type.includes('BoundaryEvent')) {
    passed = false;
    problems.push({ id: elem.id, problem: 'Boundary events are not supported.' });
  } else if (elem.$type.includes('Transaction')) {
    passed = false;
    problems.push({ id: elem.id, problem: 'Transactions are not supported.' });
  } else {
    //validate number of incoming and outgoing sequence flows
    let inAndOut = validateInAndOut(elem);
    if (inAndOut.passed == false) {
      passed = false;
      problems.push(inAndOut.problem);
    }
    //validations depending on element type
    if (elem.$type.includes('SequenceFlow')) {
      elemVal = validateSequenceFlow(elem, settings, meta);
    } else if (elem.$type.includes('Task')) {
      elemVal = validateTask(elem, settings, meta);
    } else if (elem.$type.includes('Event')) {
      elemVal = validateEvent(elem, settings, meta);
    } else if (elem.$type.includes('SubProcess')) {
      elemVal = validateSubProcess(elem, settings, meta);
    } else if (elem.$type.includes('CallActivity')) {
      elemVal = validateCallActivity(elem, settings, meta);
    } else if (elem.$type.includes('Gateway')) {
      elemVal = validateGateway(elem, settings, meta);
    } else {
      passed = false;
      problems.push({ id: elem.id, problem: 'Element is unexpectedly not supported.' });
    }
  }

  if (elemVal && elemVal.passed == false) {
    passed = false;
    problems.push(elemVal.problems);
  }

  const finalProblems = problems.flat();
  return { passed: passed, problems: finalProblems };
}

/**Function that checks wether a sequenceflow element has all the required information
 *
 * @param {Object} elem sequenceflow element
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateSequenceFlow(elem, settings, meta) {
  let passed = true;
  const problems = [];

  if (
    settings.considerPerformanceInSequenceFlows == true &&
    settings.ignoreMissingOptionalPerformance == false &&
    //at the moment, sequence flows after exclusive gateways can't have time information in PROCEED
    !(
      elem.sourceRef.$type.includes('ExclusiveGateway') ||
      elem.sourceRef.$type.includes('EventBasedGateway')
    )
  ) {
    if (
      settings.calculations.includes('time') &&
      !meta.timePlannedDuration &&
      !(meta.timePlannedOccurrence && meta.timePlannedEnd)
    ) {
      passed = false;
      problems.push({ id: elem.id, problem: 'Element is missing time information.' });
    }
    //dates?
  }

  return { passed: passed, problems: problems };
}

/**Function that checks wether a task element has all the required information
 *
 * @param {Object} elem task element
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateTask(elem, settings, meta) {
  let passed = true;
  const problems = [];

  //needs info according to settings (ignore missing basic performance, calculations)
  if (settings.ignoreMissingBasicPerformance == false) {
    let timeInfo = validateTimeInfo(elem, meta, settings);
    if (timeInfo.passed == false) {
      passed = false;
      problems.push(timeInfo.problems);
    }

    if (settings.calculations.includes('cost') && !meta.costsPlanned) {
      passed = false;
      problems.push({ id: elem.id, problem: 'Element is missing cost information.' });
    }
  }

  const finalProblems = problems.flat();

  return { passed: passed, problems: finalProblems };
  //technically necessary, but not supported in PROCEED (yet): if standardLoopCharacteristics, the task needs a repetiton probability, if multiInstanceLoopCharacteristics and isSequential, it needs a repetition count
}

/**Function that checks wether an event element has all the required information
 *
 * @param {Object} elem event element
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateEvent(elem, settings, meta) {
  let passed = true;
  const problems = [];

  if (elem.$type.includes('Intermediate')) {
    if (
      (elem.timerEventDefinition ||
        elem.incoming[0].sourceRef.$type.includes('EventBasedGateway')) &&
      settings.ignoreMissingBasicPerformance == false &&
      settings.calculations.includes('time') &&
      !meta.timePlannedDuration &&
      !(meta.timePlannedOccurrence && meta.timePlannedEnd)
    ) {
      passed = false;
      problems.push({
        id: elem.id,
        problem: 'Intermediate events after event based gateways need time information.',
      });
    }
  }

  const finalProblems = problems.flat();

  return { passed: passed, problems: finalProblems };
}

/**Function that checks wether a subprocess element is supported/allowed and has the required information
 *
 * @param {Object} elem sub process element
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateSubProcess(elem, settings, meta) {
  let passed = true;
  const problems = [];

  if (elem.triggeredByEvent && elem.triggeredByEvent == true) {
    passed = false;
    problems.push({
      id: elem.id,
      problem: 'Event-Sub-Processes are not supported.',
    });
  } else if (
    settings.overwriteWithParentPerformance == true &&
    settings.ignoreMissingBasicPerformance == false
  ) {
    let timeInfo = validateTimeInfo(elem, meta, settings);
    if (timeInfo.passed == false) {
      passed = false;
      problems.push(timeInfo.problems);
    }
    if (settings.calculations.includes('cost') && !meta.costsPlanned) {
      passed = false;
      problems.push({ id: elem.id, problem: 'Element is missing cost information.' });
    }
  }
  const finalProblems = problems.flat();

  return { passed: passed, problems: finalProblems };
}

/**Function that checks wether a call activity element has the required information
 *
 * @param {Object} elem call activity element
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateCallActivity(elem, settings, meta) {
  let passed = true;
  const problems = [];

  if (!elem.calledElement) {
    passed = false;
    problems.push({ id: elem.id, problem: 'Element is missing reference to called process.' });
  }
  if (
    settings.overwriteWithParentPerformance == true &&
    settings.ignoreMissingBasicPerformance == false
  ) {
    let timeInfo = validateTimeInfo(elem, meta, settings);
    if (timeInfo.passed == false) {
      passed = false;
      problems.push(timeInfo.problems);
    }
    if (settings.calculations.includes('cost') && !meta.costsPlanned) {
      passed = false;
      problems.push({ id: elem.id, problem: 'Element is missing cost information.' });
    }
  }
  const finalProblems = problems.flat();

  return { passed: passed, problems: finalProblems };
}

/**Function that checks wether a gateway element is supported/allowed and whether the related required information is provided
 *
 * @param {Object} elem gateway element
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateGateway(elem) {
  let passed = true;
  const problems = [];

  if (elem.$type.includes('InclusiveGateway') || elem.$type.includes('ComplexGateway')) {
    passed = false;
    problems.push({
      id: elem.id,
      problem: 'Inclusive or complex gateways are not supported.',
    });
  } else if (!elem.$type.includes('ParallelGateway') && elem.outgoing.length > 1) {
    let noProbabilities = elem.outgoing.every((elem) => {
      let meta = getMetaDataFromElement(elem);
      if (!meta.occurrenceProbability) {
        return true;
      } else return false;
    });
    let total = elem.outgoing.reduce((acc, current) => {
      let meta = getMetaDataFromElement(current);
      if (
        !meta.occurrenceProbability &&
        noProbabilities == false //if no probabilities were given at all, they may be assigned as: all outgoing sequence flows get the probability 100/(gateway.outgoing.length)}
      ) {
        passed = false;
      }
      let prob = Number(meta.occurrenceProbability) || 0;
      return acc + prob;
    }, 0);
    if (passed == false) {
      problems.push({ id: elem.id, problem: 'All outgoing paths need probabilities.' });
    } else if (total != 100 && total != 0) {
      passed = false;
      problems.push({
        id: elem.id,
        problem: 'The outgoing path probabilities need to add up to 100%.',
      });
    }
  }

  return { passed: passed, problems: problems };
}

module.exports = {
  validateElement,
};
