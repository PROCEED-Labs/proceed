const { getMetaDataFromElement } = require('@proceed/bpmn-helper');
const { getTimeInfos } = require('../helper/timeHelper');

/**Function that gets information about a process element (events, subprocesses, call activities, tasks and sequence flows)
 *
 * @param {Object} elem (previously validated) event, subprocess, call activity, task or sequence flow
 * @param {Object} settings (only relevant for sequence flows)
 * @returns {Object} an object with the element information {$type, id, parentProcessId, duration, start, end, cost, probability, gateways, validatedElements, calledProcess}
 */
function extractElementInfos(elem, settings) {
  let meta = getMetaDataFromElement(elem);
  let timeInfos = getTimeInfos(meta);

  let elemInfos = {
    $type: elem.$type,
    id: elem.id,
    parentProcessId: elem.$parent.id,
    duration: timeInfos.duration,
    start: timeInfos.start, //Date or 'none'
    end: timeInfos.end, //Date or 'none'
    cost: Number(meta.costsPlanned || 0),
    probability: Number(meta.occurrenceProbability || 100), //only relevant for certain sequence flows
    gateways: elem.gateways || [], //only relevant for call activities and sub processes
    validatedElements: elem.validatedElements || [], //only relevant for call activities and sub processes
    calledProcess: elem.calledElement || '', //only relevant for call activities
  };

  if (elem.$type.includes('Event') || elem.$type.includes('SequenceFlow')) {
    elemInfos.cost = 0;
  }

  if (elem.$type.includes('SequenceFlow')) {
    if (settings.considerPerformanceInSequenceFlows == false) {
      elemInfos.duration = 0;
    }
    //for sequence flows out of exclusive/event-based splitting gateways: if no probabilities were given at all (for all paths), they may be assigned the probability 100/(gateway.outgoing.length)}
    if (
      !meta.occurrenceProbability &&
      elem.sourceRef.outgoing.length > 1 &&
      (elem.sourceRef.$type.includes('Exclusive') || elem.sourceRef.$type.includes('EventBased'))
    ) {
      let noProbabilities = elem.sourceRef.outgoing.every((el) => {
        let elemMeta = getMetaDataFromElement(el);
        if (!elemMeta.occurenceProbability) {
          return true;
        } else return false;
      });
      if (noProbabilities == true) {
        //this (and every other) outgoing sequence flow of the respective gateway gets the probability 100/(gateway.outgoing.length)
        elemInfos.probability = 100 / elem.sourceRef.outgoing.length;
      }
    }
  }

  return elemInfos;
}

module.exports = {
  extractElementInfos,
};
