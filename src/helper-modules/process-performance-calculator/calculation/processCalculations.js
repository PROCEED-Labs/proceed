/**Function that calculates time and cost related performance parameters for all process entities in a main process (total performance as well as individual and cumulative element performance)
 * (wrapper)
 * @param {Array} processObjects [{ processId, validationPassed, extractionSuccessful, orderedProcess, problems }]
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Object} [{ processId, failed, processPerformance, problems }]
 * processPerformance: {elementPerformanceArray, totalPerformance}
 * elementPerformanceArray: [{id, $type, parentProcessId, element performance, cumulative performance}] for relevant elements (not gateways) in the process
 */
function calculatePerformance(processObjects, settings) {
  const processResults = processObjects.map((elem) => {
    const result = {
      processId: elem.processId,
      failed: false,
      processPerformance: '',
      problems: elem.problems,
    };

    if (elem.validationPassed == false) {
      result.failed = true;
    } else if (elem.extractionSuccessful == false) {
      result.failed = true;
      result.problems = [
        { id: elem.processId, problem: 'Process elements could not be extracted for calculation.' },
      ];
    } else {
      const initialPerformance = { duration: 0, cost: 0, lastEndDate: 'none' };
      result.processPerformance = calculateProcessPerformance(
        elem.orderedProcess,
        settings,
        initialPerformance,
      ); //returns {elementPerformanceArray, totalPerformance}
    }

    return result;
  });

  return processResults;
}

/**Function that calculates time and cost related performance parameters for an ordered process array (total performance as well as individual and cumulative element performance)
 *
 * @param {Array} orderedProcess process array that contains all process elements in the correct order, in block-structured form and with additional extracted information
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @param {Object} cumulativePerformance is used to determine the performance up until an element { duration, cost, lastEndDate }
 * @returns {Object} {elementPerformanceArray, totalPerformance}
 */
function calculateProcessPerformance(orderedProcess, settings, cumulativePerformance) {
  const elementPerformanceArray = []; //when done: [{id, $type, parentProcessId, element performance, cumulative performance}] for relevant elements (not gateways) in the process
  const cumulative = {
    duration: cumulativePerformance.duration,
    cost: cumulativePerformance.cost,
    lastEndDate: cumulativePerformance.lastEndDate,
  };

  const totalPerformanceComponents = orderedProcess.map((elem) => {
    if (elem.$type.includes('Block')) {
      //block calculation
      const blockPerformance = calculateBlockPerformance(elem, settings, cumulative);
      //update cumulativePerformance
      cumulative.duration += blockPerformance.totalPerformance.duration.average;
      cumulative.cost += blockPerformance.totalPerformance.cost.average;
      cumulative.lastEndDate = blockPerformance.totalPerformance.endDate.average; //action required if 'none'

      elementPerformanceArray.push(blockPerformance.elementPerformanceArray);
      //return avg, max, min block performance for total performance calculation
      return {
        duration: blockPerformance.totalPerformance.duration, //action required?
        cost: blockPerformance.totalPerformance.cost, //action required?
      };
    } else if (elem.$type.includes('SubProcess') || elem.$type.includes('CallActivity')) {
      if (settings.overwriteWithParentPerformance == false) {
        //nested process calculation
        //subprocesses/calls { $type: elem.$type, id: elem.id, parent: elem, nestedProcess: orderedSub or orderedCall }
        const nestedPerformance = calculateProcessPerformance(
          elem.nestedProcess,
          settings,
          cumulative,
        );
        const nestedTotal = nestedPerformance.totalPerformance;
        //update cumulative performance:
        cumulative.duration += nestedTotal.duration.average;
        cumulative.cost += nestedTotal.cost.average;
        cumulative.lastEndDate = nestedTotal.endDate.average; //action required if 'none'

        //update subProcess/callActivity element itself -> {id, $type, parentProcessId, element performance, cumulative performance}
        elementPerformanceArray.push({
          id: elem.id,
          $type: elem.$type,
          parentProcessId: elem.parent.parentProcessId,
          elementPerformance: {
            duration: nestedTotal.duration.average, //only average?
            cost: nestedTotal.cost.average, //only average?
            startDate: nestedTotal.startDate.average, //only average?
            endDate: nestedTotal.endDate.average, //only average?
          }, //action required?
          cumulativePerformance: { duration: cumulative.duration, cost: cumulative.cost },
        });

        elementPerformanceArray.push(nestedPerformance.elementPerformanceArray);
        //return avg, max, min nested performance for total performance calculation
        return {
          duration: nestedTotal.duration,
          cost: nestedTotal.cost,
        };
      } else {
        let duration = elem.parent.duration;
        let cost = elem.parent.cost;
        let start = elem.parent.start; //action required if 'none'
        let end = elem.parent.end; //action required if 'none'

        //take parent performance (like normal element with elem.parent)
        cumulative.duration += duration;
        cumulative.cost += cost;
        cumulative.lastEndDate = end;

        elementPerformanceArray.push({
          id: elem.id,
          $type: elem.$type,
          parentProcessId: elem.parent.parentProcessId,
          elementPerformance: { duration: duration, cost: cost, startDate: start, endDate: end },
          cumulativePerformance: { duration: cumulative.duration, cost: cumulative.cost },
        });

        return {
          duration: { average: duration, min: duration, max: duration },
          cost: { average: cost, min: cost, max: cost },
        };
      }
    } else {
      //normal elements { $type, id, parentProcessId, duration, start, end, cost }
      cumulative.duration += elem.duration;
      cumulative.cost += elem.cost;
      cumulative.lastEndDate = elem.endDate; //action required if 'none'

      elementPerformanceArray.push({
        id: elem.id,
        $type: elem.$type,
        parentProcessId: elem.parentProcessId,
        elementPerformance: {
          duration: elem.duration,
          cost: elem.cost,
          startDate: elem.start, //action required if 'none'
          endDate: elem.end, //action required if 'none'
        },
        cumulativePerformance: { duration: cumulative.duration, cost: cumulative.cost },
      });

      return {
        duration: { average: elem.duration, min: elem.duration, max: elem.duration },
        cost: { average: elem.cost, min: elem.cost, max: elem.cost },
      };
    }
  });

  const initialPerformance = {
    duration: { average: 0, min: 0, max: 0 }, //in ms
    cost: { average: 0, min: 0, max: 0 }, //in €
    startDate: { average: 'none', min: 'none', max: 'none' }, //action required
    endDate: { average: 'none', min: 'none', max: 'none' }, //action required
  };

  const totalPerformance = totalPerformanceComponents.reduce((acc, elem) => {
    acc.duration.average += elem.duration.average;
    acc.duration.min += elem.duration.min;
    acc.duration.max += elem.duration.max;
    acc.cost.average += elem.cost.average;
    acc.cost.min += elem.cost.min;
    acc.cost.max += elem.cost.max;
    return acc;
  }, initialPerformance);

  //still required: start and/or end date calculation

  const finalElementPerformanceArray = elementPerformanceArray.flat();

  return {
    elementPerformanceArray: finalElementPerformanceArray,
    totalPerformance: totalPerformance,
  };
}

/**Function that calculates the performance of a gateway block element (looping blocks or normal gateway blocks from split to join)
 *
 * @param {Object} elem gateway block element
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @param {Object} cumulativePerformance is used to determine the performance up until an element { duration, cost, lastEndDate }
 * @returns {Object} calculated total block performance { elementPerformanceArray, totalPerformance }
 */
function calculateBlockPerformance(elem, settings, cumulativePerformance) {
  const blockPerformanceArray = []; //when done: [{id, parentProcessId, $type, element performance, cumulative performance}] for relevant elements (not gateways) in the process
  const total = {
    duration: { average: 0, min: 0, max: 0 }, //in ms
    cost: { average: 0, min: 0, max: 0 }, //in €
    startDate: { average: 'none', min: 'none', max: 'none' },
    endDate: { average: 'none', min: 'none', max: 'none' },
  };
  const cumulative = {
    duration: cumulativePerformance.duration,
    cost: cumulativePerformance.cost,
    lastEndDate: cumulativePerformance.lastEndDate,
  }; //not entirely sure if this is necessary

  if (elem.$type.includes('Loop')) {
    //loop block: { $type: 'LoopBlock', split: split, join: gateway, loopedPath: loopPath, loopingSequenceFlow: getSequenceFlowInfos(loopingSequenceFlow), }

    const pathPerformance = calculateProcessPerformance(elem.loopedPath, settings, cumulative);
    blockPerformanceArray.push(pathPerformance.elementPerformanceArray);
    //loop formula: loop performance = path performance/(1-repetition probability)
    let divisor = 1 - elem.loopingSequenceFlow.probability / 100;
    let duration = pathPerformance.totalPerformance.duration;
    let cost = pathPerformance.totalPerformance.cost;

    total.duration.average = duration.average / divisor;
    total.duration.max = duration.max / divisor; //(although technically the max would be infinite repetitons)
    total.duration.min = duration.min; //minimum: no repetition, just one execution

    total.cost.average = cost.average / divisor;
    total.cost.max = cost.max / divisor; //(although technically the max would be infinite repetitons)
    total.cost.min = cost.min; //minimum: no repetition, just one execution
  } else {
    //exclusive (incl. event-based) or parallel block: { $type: 'ParallelBlock' || 'ExclusiveBlock, split: gateway, join: join, blockPaths: blockPaths, }
    const pathPerformances = elem.blockPaths.map((el) => {
      const pathPerformance = calculateProcessPerformance(el, settings, cumulative);
      blockPerformanceArray.push(pathPerformance.elementPerformanceArray);
      let weight = el[0].probability / 100;
      return {
        weight: weight,
        dur: pathPerformance.totalPerformance.duration,
        cost: pathPerformance.totalPerformance.cost,
      };
    });

    if (elem.$type.includes('Parallel')) {
      //parallel gateway blocks: average duration = max duration = min duration = path with maximum duration (because all paths are executed in parallel => maximum determines overall duration)
      total.duration.average = pathPerformances.reduce((acc, e) => Math.max(acc, e.dur.average), 0);
      total.duration.max = pathPerformances.reduce((acc, e) => Math.max(acc, e.dur.max), 0);
      total.duration.min = pathPerformances.reduce((acc, e) => Math.max(acc, e.dur.min), 0);

      total.cost.average = pathPerformances.reduce((acc, e) => acc + e.cost.average, 0);
      total.cost.max = pathPerformances.reduce((acc, e) => acc + e.cost.max, 0);
      total.cost.min = pathPerformances.reduce((acc, e) => acc + e.cost.min, 0);
    } else {
      //exclusive or event-based gateway blocks
      total.duration.average = pathPerformances.reduce(
        (acc, e) => acc + e.dur.average * e.weight,
        0,
      );
      total.duration.max = pathPerformances.reduce((acc, e) => Math.max(acc, e.dur.max), 0);
      total.duration.min = pathPerformances.reduce((acc, e) => Math.min(acc, e.dur.min), Infinity);

      total.cost.average = pathPerformances.reduce((acc, e) => acc + e.cost.average * e.weight, 0);
      total.cost.max = pathPerformances.reduce((acc, e) => Math.max(acc, e.cost.max), 0);
      total.cost.min = pathPerformances.reduce((acc, e) => Math.min(acc, e.cost.min), Infinity);
    }
  }

  const elArr = blockPerformanceArray.flat();

  return { elementPerformanceArray: elArr, totalPerformance: total };
}

module.exports = {
  calculatePerformance,
};
