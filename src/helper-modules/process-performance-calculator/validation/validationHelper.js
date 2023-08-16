const { getMetaDataFromElement } = require('@proceed/bpmn-helper');
const { getTimeInfos } = require('../helper/timeHelper');

/**Function that checks whether the element is connected to the right number of previous or following elements
 *
 * @param {Object} elem bpmn flow element
 * @returns {Object} { passed: true or false, problem: { id: elem.id, problem: 'problem description' } }
 */
function validateInAndOut(elem) {
  let incoming = 1;
  let outgoing = 1;

  let outLength = elem.outgoing ? elem.outgoing.length : 0;
  let inLength = elem.incoming ? elem.incoming.length : 0;

  if (elem.$type.includes('Start')) {
    if (outLength != outgoing) {
      return {
        passed: false,
        problem: { id: elem.id, problem: 'Wrong number of outgoing sequence flows.' },
      };
    }
  } else if (elem.$type.includes('End')) {
    if (inLength != incoming) {
      return {
        passed: false,
        problem: { id: elem.id, problem: 'Wrong number of incoming sequence flows.' },
      };
    }
  } else if (elem.$type.includes('SequenceFlow')) {
    if (!elem.sourceRef || !elem.targetRef) {
      //probably impossible though
      return {
        passed: false,
        problem: {
          id: elem.id,
          problem: 'Sequence flows need to be connected to a source and a target element.',
        },
      };
    }
  } else if (elem.$type.includes('Gateway')) {
    if (!(inLength == 1 && outLength > 1) && !(inLength > 1 && outLength == 1)) {
      return {
        passed: false,
        problem: {
          id: elem.id,
          problem:
            'Gateways need 1 incoming and >1 outgoing or >1 incoming and 1 outgoing sequence flows.',
        },
      };
    }
  } else if (inLength != incoming || outLength != outgoing) {
    return {
      passed: false,
      problem: { id: elem.id, problem: 'Wrong number of incoming or outgoing sequence flows.' },
    };
  }
  return { passed: true, problem: '' };
}

/**Function that checks whether the required time related information is provided and correct.
 *
 * @param {Object} elem bpmn flow element
 * @param {Object} meta element meta data (as received by getMetaDataFromElement())
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateTimeInfo(elem, meta, settings) {
  //action required: maybe start date or deadline for start/end?
  let passed = true;
  let problems = [];

  if (
    settings.calculations.includes('time') &&
    !meta.timePlannedDuration &&
    !(meta.timePlannedOccurrence && meta.timePlannedEnd)
  ) {
    passed = false;
    problems.push({ id: elem.id, problem: 'Element is missing time information.' });
  }
  if (settings.calculations.includes('dates')) {
    if (
      !(meta.timePlannedOccurrence && meta.timePlannedDuration) &&
      !(meta.timePlannedEnd && meta.timePlannedDuration) &&
      !(meta.timePlannedOccurrence && meta.timePlannedEnd)
    ) {
      passed = false;
      problems.push({ id: elem.id, problem: 'Element is missing date information.' });
    }
    let ascendingDates = validateDateAscension(elem);
    if (ascendingDates.passed == false) {
      passed = false;
      problems.push(ascendingDates.problems);
    }
  }
  return { passed: passed, problems: problems };
}

/**Function that checks whether the given dates in a process are ascending, both within an element (i.e. start < end) and between an element and the next one that is not a gateway or sequenceflow (NEEDS TO BE IMPROVED)
 *
 * @param {Object} elem bpmn flow element (gateways, sequence flows and end events are not checked)
 * @returns {Object} { passed: true or false, problems: [{ id: elem.id, problem: 'problem description' }] }
 */
function validateDateAscension(elem) {
  //should be improved to check all elements after this one that have date information
  let passed = true;
  const problems = [];

  if (
    !elem.$type.includes('Gateway') &&
    !elem.$type.includes('SequenceFlow') &&
    !elem.$type.includes('EndEvent')
  ) {
    let meta = getMetaDataFromElement(elem);
    let timeInfos = getTimeInfos(meta);

    if (timeInfos.startTime != 'none' || timeInfos.endTime != 'none') {
      if (
        timeInfos.startTime != 'none' &&
        timeInfos.endTime != 'none' &&
        timeInfos.startTime > timeInfos.endTime
      ) {
        passed = false;
        problems.push({
          id: elem.id,
          problem: 'The start date of this element is later than the end date.',
        });
      }

      let tempId = elem.id;
      let nextOutgoing = elem.outgoing;
      if (elem.outgoing[0].targetRef.$type.includes('Gateway')) {
        nextOutgoing = elem.outgoing[0].targetRef.outgoing;
      }
      nextOutgoing.forEach((elem) => {
        let nextMeta = getMetaDataFromElement(elem.targetRef);
        let nextTimeInfos = getTimeInfos(nextMeta);
        let checkNext = true;

        if (
          (timeInfos.startTime != 'none' &&
            ((nextTimeInfos.start != 'none' && timeInfos.startTime > nextTimeInfos.startTime) ||
              (nextTimeInfos.end != 'none' && timeInfos.startTime > nextTimeInfos.endTime))) ||
          (timeInfos.endTime != 'none' &&
            ((nextTimeInfos.start != 'none' && timeInfos.endTime > nextTimeInfos.startTime) ||
              (nextTimeInfos.end != 'none' && timeInfos.endTime > nextTimeInfos.endTime)))
        ) {
          checkNext = false;
        }

        if (checkNext == false) {
          passed = false;
          problems.push({
            id: tempId,
            problem:
              'The start or end date of this element is later than the start or end date of the next element that is not a gateway or sequence flow.',
          });
        }
      });
    }
  }

  return { passed: passed, problems: problems };
}

module.exports = {
  validateInAndOut,
  validateTimeInfo,
};
