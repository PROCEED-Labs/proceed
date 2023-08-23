const NeoEngine = require('neo-bpmn-engine');
const distribution = require('@proceed/distribution');
const {
  getProcessIds,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
} = require('@proceed/bpmn-helper');
const { abortInstanceOnNetwork } = require('./processForwarding.js');
const { timer } = require('@proceed/system');

const {
  enableInterruptedInstanceRecovery,
  enableMessaging,
} = require('../../../../../../FeatureFlags.js');

const {
  publishCurrentInstanceState,
  setupEngineStatusInformationPublishing,
} = require('./publishStateUtils');

/**
 * Creates a callback function that can be used to handle calls from the log stream of the neo engine
 *
 * @param {Object} engine proceed engine instance that contains the process information
 */
function getLogHandler(engine, instance) {
  return (bpmnLog) => {
    engine._log.log({
      level: NeoEngine.LogLevel[bpmnLog.level].toLowerCase(),
      msg: bpmnLog.message,
      moduleName: 'BPMN-ENGINE',
      instanceId: instance.id,
    });
  };
}

/**
 * Creates a callback function that can be used to handle calls from the onEnded hook of the neo engine
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance that ended
 */
function getOnEndedHandler(engine, instance) {
  return async () => {
    engine._log.info({
      msg: `Process instance ended. Id = ${instance.id}`,
      instanceId: instance.id,
    });

    // send the instance information
    if (enableMessaging) {
      await publishCurrentInstanceState(engine, instance);
    }

    // archive the information for the finalized instance
    await engine.archiveInstance(instance.id);

    // remove the instance data from the engine
    engine.deleteInstance(instance.id);

    if (typeof engine.instanceEventHandlers.onEnded === 'function') {
      engine.instanceEventHandlers.onEnded(instance);
    }
    // if this instance was invoked by a call activity make sure to complete that call activity in the calling instance
    if (instance.callingInstance) {
      // get the final variable state of this instance
      const variables = instance.getVariables();

      // get the instance from which this one got started
      const callingEngine = engine._management.getEngineWithID(instance.callingInstance);
      const callingInstance = callingEngine.getInstance(instance.callingInstance);

      // get the token and activity that started this instance
      const callingToken = callingInstance
        .getState()
        .tokens.find((token) => token.calledInstance === instance.id);
      const callActivityId = callingToken.currentFlowElementId;

      // complete the call activity in the calling instance with the final variable state of this instance
      callingInstance.completeActivity(callActivityId, callingToken.tokenId, variables);
    }
  };
}

/**
 * Creates a callback function that can be used to handle calls from the onAborted hook of the neo engine
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance that ended
 */
function getOnAbortedHandler(engine, instance) {
  return () => {
    engine._log.info({
      msg: `Process instance aborted. Id = ${instance.id}`,
      instanceId: instance.id,
    });
    engine._log.info({
      msg: `Broadcasting instance abort signal into network. Id = ${instance.id}`,
      instanceId: instance.id,
    });
    abortInstanceOnNetwork(engine.definitionId, instance.id);
  };
}

/**
 * Creates a callback function that can be used to handle calls from the onTokenEnded hook of the neo engine
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the token is in
 */
function getOnTokenEndedHandler(engine, instance) {
  return (token) => {
    engine._log.info({
      msg: `Token with id ${token.tokenId} ended. InstanceId = ${instance.id} `,
      instanceId: instance.id,
    });

    if (typeof engine.instanceEventHandlers.onTokenEnded === 'function') {
      engine.instanceEventHandlers.onTokenEnded(token);
    }
  };
}

/**
 * Creates a callback function that can be used to handle calls from the onScriptTaskError hook of the neo engine
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the token is in
 */
function getOnScriptTaskErrorHandler(engine, instance) {
  return (execution) => {
    // engine._log.info({
    //   msg: `Technical Error in Script Task with id ${execution.flowElementId} on token ${execution.tokenId}. InstanceId = ${instance.id} `,
    //   instanceId: instance.id,
    // });
  };
}

/**
 * Creates a callback function that can be used to handle calls from the onUserTaskInterrupted hook of the neo engine
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the token is in
 */
function getOnUserTaskInterruptedHandler(engine, instance) {
  return (execution) => {
    engine._log.info({
      msg: `User Task with id ${execution.flowElementId} on token ${execution.tokenId} ended. InstanceId = ${instance.id} `,
      instanceId: instance.id,
    });
    // update user task in list
    const index = engine.userTasks.findIndex(
      (uT) =>
        uT.processInstance.id === instance.id &&
        uT.id === execution.flowElementId &&
        uT.startTime === execution.startTime,
    );

    if (index > -1) {
      const newUserTask = { ...engine.userTasks[index], state: execution.executionState };
      engine.userTasks.splice(index, 1, newUserTask);
    }
  };
}

/**
 * Creates a callback function that can be used to handle calls from the onCallActivityInterrupted hook of the neo engine
 * -> stop execution of call activity processs
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the token is in
 */
function getOnCallActivityInterruptedHandler(engine, instance) {
  return async (execution) => {
    const callActivityId = execution.flowElementId;

    const { definitionId } = getTargetDefinitionsAndProcessIdForCallActivityByObject(
      engine.getInstanceBpmn(instance.id),
      callActivityId,
    );

    const importedProcessEngine = engine._management.getEngineWithDefinitionId(definitionId);

    importedProcessEngine.instanceIDs.forEach((importInstanceId) => {
      const importInstance = importedProcessEngine.getInstance(importInstanceId);

      if (importInstance.callingInstance === instance.id) {
        importedProcessEngine.stopInstance(importInstanceId);
      }
    });
  };
}

/**
 * Archives intermediate instance states (might be used to recover the instance when the engine was intermittently stopped)
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the token is in
 */
function saveIntermediateInstanceState(engine, instance) {
  // dont archive the final instance state since it is archived by another function
  if (!instance.isEnded() && engine.getInstance(instance.id)) {
    distribution.db.archiveInstance(engine.definitionId, instance.id, {
      ...engine.getInstanceInformation(instance.id),
      isCurrentlyExecutedInBpmnEngine: true,
    });
  }
}

/**
 * Creates a callback function that can be used to handle all changes to the overall state of an instance
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the token is in
 */
function getStateChangeHandler(engine, instance) {
  let timeout;
  // Debounce to prevent the logic from being triggered for every atomic change (finishing an activity would lead to more than 20 updates)
  return () => {
    timer.clearTimeout(timeout);
    timeout = timer.setTimeout(() => {
      if (enableInterruptedInstanceRecovery) {
        saveIntermediateInstanceState(engine, instance);
      }
      // prevent errors/crashes when the instance was already removed (archived) from the engine (publishing should have been handled by onEnded handler in that case)
      if (enableMessaging && !instance.isEnded() && engine.getInstance(instance.id)) {
        publishCurrentInstanceState(engine, instance);
      }
    }, 500);
  };
}

module.exports = {
  /**
   * Returns a callback function that is used for the instance stream of the neo engine
   * this callBack registers callback functions for the different lifecycle hooks of a newly created process
   *
   * @param {Object} engine proceed engine instance that contains the process information
   */
  getNewInstanceHandler(engine) {
    return (newInstance) => {
      if (!engine.originalInstanceState) {
        // we are starting a new instance
        engine._log.info({
          msg: `A new process instance was created. Id = ${newInstance.id}`,
          instanceId: newInstance.id,
        });
      } else {
        engine._log.info({
          msg: `Process instance started. Id = ${newInstance.id}`,
          instanceId: newInstance.id,
        });
        // we are starting a new local instance to continue an instance started on another machine
      }
      engine.instanceIDs.push(newInstance.id);

      const state = newInstance.getState();
      const processId = state.processId.substring(0, state.processId.lastIndexOf('-'));
      const processVersion = state.processId.substring(processId.length + 1);

      engine._instanceIdProcessMapping[newInstance.id] =
        engine._versionProcessMapping[processVersion];

      newInstance.getLog$().subscribe(getLogHandler(engine, newInstance)); // subscribe to log-stream of bpmn processinstance

      // Set up lifecycle listeners
      if (typeof engine.instanceEventHandlers.onStarted === 'function') {
        engine.instanceEventHandlers.onStarted(newInstance);
      }

      newInstance.onEnded(getOnEndedHandler(engine, newInstance));

      newInstance.onScriptTaskError(getOnScriptTaskErrorHandler(engine, newInstance));

      newInstance.onAborted(getOnAbortedHandler(engine, newInstance));

      newInstance.onUserTaskInterrupted(getOnUserTaskInterruptedHandler(engine, newInstance));

      newInstance.onCallActivityInterrupted(
        getOnCallActivityInterruptedHandler(engine, newInstance),
      );

      newInstance.onTokenEnded(getOnTokenEndedHandler(engine, newInstance));

      newInstance.onFlowNodeExecuted((execution) => {
        const token = engine.getToken(newInstance.id, execution.tokenId);
        // move information about milestones to log and delete from token
        if (token) {
          if (token.currentFlowNodeProgress && token.currentFlowNodeProgress.manual) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              progress: token.currentFlowNodeProgress,
            });

            if (execution.executionState === 'COMPLETED') {
              newInstance.updateToken(token.tokenId, {
                currentFlowNodeProgress: undefined,
              });
            }
          } else if (
            token.currentFlowNodeProgress &&
            !token.currentFlowNodeProgress.manual &&
            execution.executionState === 'COMPLETED'
          ) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              progress: { value: 100, manual: false },
            });
            if (token.state === 'ENDED') {
              newInstance.updateToken(token.tokenId, {
                currentFlowNodeProgress: { value: 100, manual: false },
              });
            } else {
              newInstance.updateToken(token.tokenId, {
                currentFlowNodeProgress: undefined,
              });
            }
          } else if (
            token.currentFlowNodeProgress &&
            !token.currentFlowNodeProgress.manual &&
            execution.executionState !== 'COMPLETED'
          ) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              progress: token.currentFlowNodeProgress,
            });
          }
          if (token.milestones) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              milestones: token.milestones,
            });
            if (execution.executionState === 'COMPLETED') {
              newInstance.updateToken(token.tokenId, { milestones: undefined });
            }
          }
          if (token.currentFlowNodeIsExternal) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              external: true,
            });
            newInstance.updateToken(execution.tokenId, { currentFlowNodeIsExternal: undefined });
          }
          if (token.calledInstance) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              calledInstance: token.calledInstance,
            });
            newInstance.updateToken(execution.tokenId, { calledInstance: undefined });
          }
          if (token.flowElementExecutionWasInterrupted) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              executionWasInterrupted: true,
            });
            newInstance.updateToken(execution.tokenId, {
              flowElementExecutionWasInterrupted: undefined,
            });
          }

          if (token.costsRealSetByOwner) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              costsRealSetByOwner: token.costsRealSetByOwner,
            });
            newInstance.updateToken(execution.tokenId, { costsRealSetByOwner: undefined });
          }

          if (token.priority) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              priority: token.priority,
            });
            newInstance.updateToken(execution.tokenId, { priority: undefined });
          }

          if (token.performers) {
            newInstance.updateLog(execution.flowElementId, execution.tokenId, {
              performers: token.performers,
            });
            newInstance.updateToken(execution.tokenId, { performers: undefined });
          }

          const flowElement = newInstance.getFlowElement(execution.flowElementId);
          if (flowElement && flowElement.$type === 'bpmn:UserTask') {
            // update user task in list
            const index = engine.userTasks.findIndex(
              (uT) =>
                uT.processInstance.id === newInstance.id &&
                uT.id === flowElement.id &&
                uT.startTime === execution.startTime,
            );

            if (index > -1) {
              const newUserTask = { ...engine.userTasks[index], state: execution.executionState };
              engine.userTasks.splice(index, 1, newUserTask);
            }
          }
        }

        if (!execution.machine) {
          newInstance.updateLog(execution.flowElementId, execution.tokenId, {
            machine: engine.machineInformation,
          });
          engine._log.info({
            msg: `Finished execution of flowNode ${execution.flowElementId}. InstanceId = ${newInstance.id}`,
            instanceId: newInstance.id,
          });
        }
      });

      // establish a publishing connection for the instance (if messaging information is stored in the bpmn) before instance information is sent using that connection
      setupEngineStatusInformationPublishing(engine, newInstance).finally(() => {
        // register a callback function that handles changes to the instances state
        newInstance.getState$().subscribe(getStateChangeHandler(engine, newInstance));
      });
    };
  },
};
