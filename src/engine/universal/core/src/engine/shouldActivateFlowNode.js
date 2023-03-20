const { handle5thIndustryUserTask } = require('./5thIndustry.js');
const {
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
  getRootFromElement,
  getMilestonesFromElementById,
  getMetaData,
  convertISODurationToMiliseconds,
} = require('@proceed/bpmn-helper');
const distribution = require('@proceed/distribution');

/**
 * Creates a callback function that can be used to register to the userTask stream of the neo engine
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the user task was encountered in
 */
function onUserTask(engine, instance, tokenId, userTask) {
  return new Promise(async (resolve) => {
    engine._log.info({
      msg: `A new User Task was encountered, InstanceId = ${instance.id}`,
      instanceId: instance.id,
    });

    function activate() {
      const userTaskIndex = engine.userTasks.findIndex(
        (uT) => uT.processInstance.id === instance.id && uT.id === userTask.id
      );
      // update userTask state if activated
      if (engine.userTasks[userTaskIndex].state === 'READY') {
        const newUserTask = { ...engine.userTasks[userTaskIndex], state: 'ACTIVE' };
        engine.userTasks.splice(userTaskIndex, 1, newUserTask);
      }
      resolve(true);
    }

    const bpmn = engine.getInstanceBpmn(instance.id);

    const token = engine.getToken(instance.id, tokenId);
    const metaData = await getMetaData(bpmn, userTask.id);

    const startTime = token.currentFlowElementStartTime;
    let endTime = null;
    if (metaData.timePlannedEnd) {
      endTime = metaData.timePlannedEnd;
    } else if (metaData.timePlannedDuration) {
      endTime = startTime + convertISODurationToMiliseconds(metaData.timePlannedDuration);
    }

    const extendedUserTask = {
      processInstance: instance,
      definitionVersion: engine.getInstanceInformation(instance.id).processVersion,
      tokenId,
      startTime,
      endTime,
      state: 'READY',
      ...userTask,
      attrs: userTask.$attrs || {},
      activate,
    };

    if (userTask.implementation === '5thIndustry') {
      const success = await handle5thIndustryUserTask(extendedUserTask, engine);

      if (!success) {
        return;
      }

      activate();
    }

    engine.userTasks.push(extendedUserTask);

    instance.updateToken(tokenId, {
      currentFlowNodeProgress: { value: 0, manual: false },
      priority: metaData.defaultPriority | 1,
    });

    const initializedMilestones = (await getMilestonesFromElementById(bpmn, userTask.id)).reduce(
      (acc, curr) => ({ ...acc, [curr.id]: 0 }),
      {}
    );

    engine.updateMilestones(instance.id, userTask.id, initializedMilestones);
  });
}

/**
 * Creates a callback that handles the execution of callActivities when one becomes active
 *
 * @param {Object} engine proceed engine instance that contains the process information
 * @param {Object} instance the process instance the call activity was encountered in
 */
function onCallActivity(engine, instance, tokenId, callActivity) {
  return new Promise(async (resolve) => {
    // get necessary process information about the process referenced by the callActivity
    const { definitionId, version } = getTargetDefinitionsAndProcessIdForCallActivityByObject(
      getRootFromElement(callActivity),
      callActivity.id
    );

    // start execution of callActivity process with variables from the current instance
    engine._log.info({
      msg: `Starting callActivity with id ${callActivity.id}. Imported process definitionId: ${definitionId}. CallingInstanceId = ${instance.id}`,
      instanceId: instance.id,
    });

    // make sure that the imported process is started with the correct version and the current instance variables
    await engine._management.createInstance(
      definitionId,
      version,
      instance.getVariables(),
      undefined,
      // onStarted callBack: log that we started an instance of a callActivity process and put a reference to the instance into the token
      (callActivityInstance) => {
        instance.updateToken(tokenId, { calledInstance: callActivityInstance.id });
        callActivityInstance.callingInstance = instance.id;
        resolve(true);
      },
      // onEnded callBack: return possibly changed variables from the callActivity instance back to the calling instance
      (callActivityInstance) => {
        const variables = callActivityInstance.getVariables();

        instance.completeActivity(callActivity.id, tokenId, variables);
      }
    );
  });
}

module.exports = {
  getShouldActivateFlowNode(engine) {
    return async function shouldActivateFlowNode(
      processId,
      processInstanceId,
      tokenId,
      flowNode,
      state
    ) {
      const instance = engine.getInstance(processInstanceId);

      if (flowNode.$attrs && flowNode.$attrs['proceed:placeholder']) {
        engine._log.warn({
          msg: `Instance ${instance.id} has encountered a placeholder. The model has to be extended before execution can continue.`,
          instanceId: instance.id,
        });
        return false;
      }

      // flowNodes that are set to external should be handled through the Neo Engine API
      if (flowNode.$attrs && flowNode.$attrs['proceed:external']) {
        instance.updateToken(tokenId, { currentFlowNodeIsExternal: true });
        return false;
      }

      if (flowNode.$type === 'bpmn:UserTask') {
        await onUserTask(engine, instance, tokenId, flowNode);
      }

      if (flowNode.$type === 'bpmn:CallActivity') {
        await onCallActivity(engine, instance, tokenId, flowNode);
      }

      if (flowNode.$type === 'bpmn:ScriptTask') {
        instance.updateToken(tokenId, { currentFlowNodeProgress: { value: 0, manual: false } });
      }

      return true;
    };
  },
};
