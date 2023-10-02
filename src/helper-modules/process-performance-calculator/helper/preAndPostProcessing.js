const { toBpmnObject } = require('@proceed/bpmn-helper');
const { transformMilisecondsToTimeFormat } = require('./timeHelper');

/**Function that transforms all processes within a process object {mainProcess, calledProcesses: [processes]} into bpmn moddle object format
 *
 * @param {Object} processes usually in xml format {mainProcess, calledProcesses: [processes]}
 * @returns {Object} { failed, result: processes (same structure: {mainProcess, calledProcesses: [processes]} in bpmn moddle object format) }
 */
async function getInputAsBpmnObjects(processes) {
  const main = processes.mainProcess;
  const called = processes.calledProcesses || [];
  let mainBpmnObj;
  const res = {
    failed: false,
    result: '',
  };
  //[{ processId, failed, processPerformance, problems }]
  try {
    mainBpmnObj = typeof main === 'string' ? await toBpmnObject(main) : main;

    if (called.length > 0) {
      const unresolved = called.map(getInputAsBpmnObjects);
      const calledResults = await Promise.all(unresolved);
      //action required: if elem.failed == true ...
      const calledBpmnObjs = calledResults.map((elem) => {
        if (elem.failed == true) {
          throw new Error();
        }
        return elem.result;
      });

      res.result = {
        mainProcess: mainBpmnObj,
        calledProcesses: calledBpmnObjs,
      };
    } else {
      res.result = {
        mainProcess: mainBpmnObj,
        calledProcesses: [],
      };
    }
    return res;
  } catch (err) {
    res.failed = true;
    res.result = [
      {
        processId: 'none',
        failed: true,
        processPerformance: '',
        problems: [
          {
            id: 'none',
            problem: 'Could not transform the process file.',
          },
        ],
      },
    ];
    return res;
  }
}

/**Function that transforms performance calculation results into readable formats and deletes parameters that were not requested
 *
 * @param {Array} processResults array of objects with performance infos or failure description for each process entity in the main process: [{processId, failed, processPerformance: {elementPerformanceArray, totalPerformance}, problems}]
 * @param {Object} settings specifies preferences for customized validation and calculation: {calculations: ['time' | 'cost' | 'dates'], considerPerformanceInSequenceFlows, overwriteWithParentPerformance, ignoreMissingBasicPerformance, ignoreMissingOptionalPerformance}
 * @returns {Array} edited performance results (formats transformed and unnecessary parts deleted)
 */
function editPerformanceResults(processResults, settings) {
  //transform performance result formats or remove parameters that were not requested from the performance results

  const finalResults = processResults.map((elem) => {
    if (elem.failed == false) {
      const total = elem.processPerformance.totalPerformance;
      const elArr = elem.processPerformance.elementPerformanceArray;

      if (settings.calculations.includes('time')) {
        //transformMilisecondsToTimeFormat for all duration values
        total.duration.average = transformMilisecondsToTimeFormat(total.duration.average);
        total.duration.min = transformMilisecondsToTimeFormat(total.duration.min);
        total.duration.max = transformMilisecondsToTimeFormat(total.duration.max);

        elArr.forEach((elem) => {
          elem.elementPerformance.duration = transformMilisecondsToTimeFormat(
            elem.elementPerformance.duration,
          );
          elem.cumulativePerformance.duration = transformMilisecondsToTimeFormat(
            elem.cumulativePerformance.duration,
          );
        });
      } else {
        //remove time related performance
        delete total.duration;
        elArr.forEach((elem) => {
          delete elem.elementPerformance.duration;
          delete elem.cumulativePerformance.duration;
        });
      }

      if (settings.calculations.includes('cost')) {
        //toString() + ' €' for all cost values
        total.cost.average = total.cost.average.toFixed(2).toString() + ' €';
        total.cost.min = total.cost.min.toFixed(2).toString() + ' €';
        total.cost.max = total.cost.max.toFixed(2).toString() + ' €';

        elArr.forEach((elem) => {
          elem.elementPerformance.cost = elem.elementPerformance.cost.toFixed(2).toString() + ' €'; //action required: element performance of nested elems
          elem.cumulativePerformance.cost =
            elem.cumulativePerformance.cost.toFixed(2).toString() + ' €'; //action required: element performance of nested elems
        });
      } else {
        //remove cost related performance
        delete total.cost;
        elArr.forEach((elem) => {
          delete elem.elementPerformance.cost;
          delete elem.cumulativePerformance.cost;
        });
      }

      if (settings.calculations.includes('dates')) {
        //action required?
      } else {
        //remove date related performance
        delete total.startDate;
        delete total.endDate;
        elArr.forEach((elem) => {
          delete elem.elementPerformance.startDate;
          delete elem.elementPerformance.endDate;
        });
      }
      elem.processPerformance.totalPerformance = total;
      elem.processPerformance.elementPerformanceArray = elArr;
    }

    return elem;
  });

  return finalResults;
}

module.exports = {
  getInputAsBpmnObjects,
  editPerformanceResults,
};
