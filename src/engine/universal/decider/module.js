const constraintManager = require('./constraintManager');
const constraintHelper = require('./constraintHelper');
const Hceval = require('./hard_constraint_evaluation/hc-eval.js');
const Sceval = require('./soft_constraint_evaluation/sc-eval.js');
const routes = require('./deciderRoutes.js');
const { config } = require('@proceed/machine');

/**
 * This Module evaluates constaints and finds the next fitting Machines
 * @module @proceed/decider
 * @see https://github.com/PROCEED-Labs/proceed/wiki/Decision-Making#architecture-of-decider
 *
 */
const decider = {
  /**
   * Function to decide after each flow node which Machine is the optimal one for the next execution
   * @see  {@link https://github.com/PROCEED-Labs/proceed/wiki/Decision-Making#architecture-of-decider|Wiki Step 1 and 5}
   *
   * @param {Object} processInfo - Infos about the current running Process Model
   * @param {string} processInfo.id - the definitions ID of the current process
   * @param {string} processInfo.name - the definitions Name value of the current process
   * @param {string} processInfo.creatorEnvId - the ID of the Environment where the process where created
   * @param {string} processInfo.creatorEnvName - the Name of the Environment where the process where created
   * @param {Object} processInfo.nextFlowNode - information about next BPMN element, the one this method tries to find the optimal machine for
   * @param {string} processInfo.nextFlowNode.id - the ID of the next BPMN element
   * @param {boolean} processInfo.nextFlowNode.isUserTask - indicates if next flow Node is a usertask
   *
   * @param {Object} token - Infos about the current running process instance, but contains only one token of the current flow (see {@link https://github.com/PROCEED-Labs/proceed/wiki/Process-Instance,-Tokens,-Datastructure-and-REST-Endpoint#the-instance|Wiki Instance Description}), at least:
   * @param {Date} token.globalStartTime - Time when the Instance was started globally
   * @param {Date} token.localStartTime - Time and date of the token start (on the local Engine)
   * @param {Date} token.localExecutionTime - Relative time in seconds a token has already needed for executing the BPMN elements
   * @param {number} token.machineHops - The number of Machines a token was already on (hopping)
   *
   * @param {flowNodeConstraints} - Contains the parsed JS-version from inside \<proceed:processConstraints\> of the next Flow Node
   * @param {processConstraints} - Contains the parsed JS-version from inside \<proceed:processConstraints\> of the complete Process
   *
   * @returns {MachineResultObject} Returns a list of engines in an object, see the type definition below
   */
  async findOptimalNextMachine(processInfo, token, flowNodeConstraints, processConstraints) {
    if (!processInfo || !token) {
      throw new Error(
        "Missing input parameter for method 'findOptimalNextMachine' in Decider Module",
      );
    }
    /**
     * Result object that contains the list of possible Machines
     *
     * @typedef {Object} MachineResultObject
     * @property {Array} engineList - List of engines
     * @property {boolean} prioritized - Indicates if the engine list is prioritized, -> means the best fit at the first index
     * @property {object} abortCheck - Indicating if token or process has to be aborted and naming unfulfilled constraint
     * @property {String} abortCheck.stopProcess - Wether token or process has to be aborted
     * @property {Array} abortCheck.unfulfilledConstraints - List of unfulfilled constraints for aborted token/process
     */

    const machineResultObject = {
      engineList: [],
      prioritized: false,
      abortCheck: {
        stopProcess: null, // "token"|"instance"|null
        unfulfilledConstraints: [],
      },
    };

    const preCheckAbortResult = await this.preCheckAbort(
      processInfo,
      token,
      flowNodeConstraints.hardConstraints || [],
      processConstraints.hardConstraints || [],
    );

    if (preCheckAbortResult.stopProcess !== null) {
      machineResultObject.abortCheck = preCheckAbortResult;
      return machineResultObject;
    }

    const hardConstraints = constraintHelper.concatAllConstraints(
      flowNodeConstraints.hardConstraints,
      processConstraints.hardConstraints,
    );

    const nonProcessExecutionHardConstraints =
      constraintHelper.filterOutProcessExecutionConstraints(hardConstraints);

    const softConstraints = constraintHelper.concatAllConstraints(
      flowNodeConstraints.softConstraints,
      processConstraints.softConstraints,
    );

    const configAllowsToExecuteLocally = await constraintManager.checkExecutionConfig(
      processInfo.nextFlowNode,
    );

    const allowedToExecuteLocally =
      configAllowsToExecuteLocally &&
      (nonProcessExecutionHardConstraints.length === 0 ||
        (await Hceval.machineSatisfiesAllHardConstraints(nonProcessExecutionHardConstraints)));

    // Step 2.2, if false: does not have to be carried only locally
    const mustExecuteLocally = await constraintManager.preCheckLocalExec(hardConstraints);
    if (mustExecuteLocally) {
      if (allowedToExecuteLocally) {
        machineResultObject.engineList.push({ id: 'local-engine' });
      }

      return machineResultObject;
    }

    // Step 2.3 + 2.4 + 2.5
    const { router } = await config.readConfig();
    const valuesList = [];

    if (allowedToExecuteLocally) {
      const preferLocalExecution =
        router.softConstraintPolicy === 'PreferLocalMachine' ||
        router.softConstraintPolicy === 'OnFirstFittingMachine';

      if (preferLocalExecution) {
        machineResultObject.engineList.push({ id: 'local-engine' });
        return machineResultObject;
      }

      const localSoftConstraintValues =
        await constraintManager.getLocalSoftConstraintValues(softConstraints);

      valuesList.push({
        id: 'local-engine',
        softConstraintValues: localSoftConstraintValues,
      });
    }

    const valuesListExternalMachines = await constraintManager.getExternalSoftConstraintValues(
      nonProcessExecutionHardConstraints,
      softConstraints,
      processInfo.nextFlowNode,
    ); // get valuesList for external machines
    valuesList.push(...valuesListExternalMachines);

    // Step 3
    const evaluatedMachines = Sceval.evaluateEveryMachine(softConstraints, valuesList);

    machineResultObject.engineList = evaluatedMachines;

    if (softConstraints.length > 0) {
      machineResultObject.prioritized = true;
    }

    return machineResultObject;
  },

  /**
   * Function to check if a process can be executed locally
   * (after receiving and before starting a process)
   * Skips steps 3.3 and 3.6
   * @see  {@link https://github.com/PROCEED-Labs/proceed/wiki/Decision-Making#architecture-of-decider|Wiki Step 1 and 5}
   *
   * @param {Object} processInfo - see {@link findOptimalNextMachine()}
   * @param {Object} token - see {@link findOptimalNextMachine()}
   * @param {flowNodeConstraints} - see {@link findOptimalNextMachine()}
   * @param {processConstraints} - see {@link findOptimalNextMachine()}
   * @returns {boolean} Returns wether the process is locally executeable
   */
  async allowedToExecuteLocally(processInfo, token, flowNodeConstraints, processConstraints) {
    if (!processInfo) {
      throw new Error(
        "Missing input parameter for method 'allowedToExecuteLocally' in Decider Module",
      );
    }

    if (token) {
      const preCheckAbortResult = await this.preCheckAbort(
        processInfo,
        token,
        flowNodeConstraints.hardConstraints || [],
        processConstraints.hardConstraints || [],
      );

      if (preCheckAbortResult.stopProcess !== null) {
        return false;
      }
    }

    if (!flowNodeConstraints.hardConstraints && !processConstraints.hardConstraints) {
      return true;
    }

    const hardConstraints = constraintHelper.concatAllConstraints(
      flowNodeConstraints.hardConstraints,
      processConstraints.hardConstraints,
    );

    const nonProcessExecutionHardConstraints =
      constraintHelper.filterOutProcessExecutionConstraints(hardConstraints);

    return Hceval.machineSatisfiesAllHardConstraints(nonProcessExecutionHardConstraints); // Step 2.4
  },

  /**
   * Function to find the optimal Machine in the MS
   * Skips steps 3.1, 3.2 and 3.4
   * @see  {@link https://github.com/PROCEED-Labs/proceed/wiki/Decision-Making#architecture-of-decider|Wiki Step 1 and 5}
   *
   * @param {Object} processInfo - see {@link findOptimalNextMachine()}
   * @param {flowNodeConstraints} - see {@link findOptimalNextMachine()}
   * @param {processConstraints} - see {@link findOptimalNextMachine()}
   * @param {Object[]} [additionalMachines] list of machines that should be considered even if not locally discovered
   * @returns {MachineResultObject} see {@link findOptimalNextMachine()}
   */
  async findOptimalExternalMachine(
    processInfo,
    flowNodeConstraints,
    processConstraints,
    additionalMachines,
  ) {
    if (!processInfo) {
      throw new Error(
        "Missing input parameter for method 'findOptimalExternalMachine' in Decider Module",
      );
    }

    const machineResultObject = {
      engineList: [],
      prioritized: false,
    };

    const hardConstraints = constraintHelper.concatAllConstraints(
      flowNodeConstraints.hardConstraints,
      processConstraints.hardConstraints,
    );

    const softConstraints = constraintHelper.concatAllConstraints(
      flowNodeConstraints.softConstraints,
      processConstraints.softConstraints,
    );

    const nonProcessExecutionHardConstraints =
      constraintHelper.filterOutProcessExecutionConstraints(hardConstraints);

    // Step 2.3 + 2.5
    const valuesList = await constraintManager.getExternalSoftConstraintValues(
      nonProcessExecutionHardConstraints,
      softConstraints,
      undefined,
      additionalMachines,
    );

    // Step 3
    const evaluatedMachines = Sceval.evaluateEveryMachine(softConstraints, valuesList);

    machineResultObject.engineList = evaluatedMachines;

    if (softConstraints.length > 0) {
      machineResultObject.prioritized = true;
    }

    return machineResultObject;
  },

  /**
   * Checks if instance/token has to be aborted
   * return with checkAbortResult-object indicating if instance or token has to be aborted, null if execution can continue
   * @param {Object} processInfo
   * @param {Object} token
   * @param {Array} flowNodeConstraints - hardConstraints of flowNode
   * @param {Array} processConstraints - hardConstraints of process
   * @returns {checkAbortResult} Returns wether the instance/token has to be aborted
   */
  async preCheckAbort(processInfo, token, flowNodeConstraints, processConstraints) {
    // use processInfo to get Env profile
    const checkAbortResult = {
      stopProcess: null,
      unfulfilledConstraints: [],
    };

    const process = await config.readConfig('process');

    const timeGlobal = Date.now() - token.globalStartTime;

    if (process.maxTimeProcessGlobal !== -1 && process.maxTimeProcessGlobal * 1000 < timeGlobal) {
      checkAbortResult.unfulfilledConstraints.push('maxTimeProcessGlobal');
    }

    if (
      process.maxTimeProcessLocal !== -1 &&
      process.maxTimeProcessLocal * 1000 < token.localExecutionTime
    ) {
      checkAbortResult.unfulfilledConstraints.push('maxTimeProcessLocal');
    }

    if (checkAbortResult.unfulfilledConstraints.length > 0) {
      checkAbortResult.stopProcess = 'instance';
      return checkAbortResult;
    }

    const filteredProcessConstraints = constraintHelper.filterOutDuplicateProcessConstraints(
      flowNodeConstraints,
      processConstraints,
    );

    const unfulfilledProcessConstraints = Hceval.evaluateExecutionConstraints(
      filteredProcessConstraints,
      {
        timeGlobal,
        time: token.localExecutionTime,
        machineHops: token.machineHops,
        storageTime: token.storageTime,
        storageRounds: token.storageRounds,
      },
    );

    if (unfulfilledProcessConstraints.length > 0) {
      checkAbortResult.unfulfilledConstraints = unfulfilledProcessConstraints.map(
        (constraint) => constraint.name,
      );
      checkAbortResult.stopProcess = 'instance';
      return checkAbortResult;
    }

    if (process.maxTimeFlowNode !== -1 && process.maxTimeFlowNode * 1000 < token.flowNodeTime) {
      checkAbortResult.unfulfilledConstraints.push('maxTimeFlowNode');
      checkAbortResult.stopProcess = 'token';
      return checkAbortResult;
    }

    const unfulfilledFlowNodeConstraints = Hceval.evaluateExecutionConstraints(
      flowNodeConstraints,
      {
        time: token.flowNodeTime,
        machineHops: token.machineHops,
        storageTime: token.storageTime,
        storageRounds: token.storageRounds,
      },
    );

    if (unfulfilledFlowNodeConstraints.length > 0) {
      checkAbortResult.unfulfilledConstraints = unfulfilledFlowNodeConstraints.map(
        (constraint) => constraint.name,
      );
      checkAbortResult.stopProcess = 'token';
      return checkAbortResult;
    }

    return checkAbortResult;
  },

  /**
   * Starts the endpoint for constraint evaluation
   */
  start() {
    routes();
  },
};
module.exports = decider;
