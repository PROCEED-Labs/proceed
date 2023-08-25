const distribution = require('@proceed/distribution');
const decider = require('@proceed/decider');
const { config } = require('@proceed/machine');
const Parser = require('@proceed/constraint-parser-xml-json/parser.js');
const { forwardProcess, forwardInstance, getMachineInfo } = require('./processForwarding.js');
const {
  getAllBpmnFlowElements,
  toBpmnObject,
  getElementsByTagName,
} = require('@proceed/bpmn-helper');

/**
 * Evaluates if the next acitvity is supposed be executed on the current engine for static deployment
 *
 * @param {object} engine instance of the engine class containing all information about the current process and its instances
 * @param {object} nextActivity information object about the activity that the token is supposed to be moved to
 * @returns {staticDeploymentResult} Result object that contains information about execution of next element
 */
async function evaluateStaticDeployment(engine, nextActivity) {
  const staticDeploymentResult = {
    continueExecution: true,
    nextMachine: null,
  };

  // get information about expected current and next machine from process
  const nextMachineId = nextActivity.machineId;

  // try to get address of next machine from activity mapping
  const nextMachineAddr = nextActivity.machineAddress || '';

  // converts address with IPv4: (ip:port) or IPv6: ([ip]:port) to (ip+port)
  const address = nextMachineAddr.replace(/\[?((?:(?:\d|\w)|:|\.)*)\]?:(\d*)/g, '$1+$2');
  let [nextIp, nextPort] = address.split('+');
  nextPort = parseInt(nextPort);

  // get information for current machine
  const { id: currId, ip: currIp, port: currPort } = engine.machineInformation;
  const { processes } = await config.readConfig();

  let nextMachine;

  if (nextMachineId && nextMachineId !== currId) {
    // the next activity is mapped to a specific machine id of another machine
    nextMachine = distribution.communication
      .getAvailableMachines()
      .find((machine) => machine.id === nextMachineId);
  } else if (!nextMachineId && (nextIp !== currIp || nextPort !== currPort)) {
    // the address of the next engine differs from the one of the current engine => get necessary machine information
    try {
      // request info about next machine from the machine itself
      const machineInfo = await getMachineInfo(nextIp, nextPort);
      if (machineInfo.id === currId) {
        staticDeploymentResult.continueExecution = !processes.deactivateProcessExecution;
        return staticDeploymentResult;
      } else {
        nextMachine = { ...machineInfo };
        nextMachine.ip = nextIp;
        nextMachine.port = nextPort;
      }
    } catch (err) {
      // if the request fails we can't send the token to next machine => fail
      staticDeploymentResult.continueExecution = false;
      return staticDeploymentResult;
    }
  } else {
    staticDeploymentResult.continueExecution = !processes.deactivateProcessExecution;
    return staticDeploymentResult;
  }

  if (nextMachine) {
    // remove unnecessary information about next machine; set hostname as name if there is no name
    staticDeploymentResult.nextMachine = (({ id, ip, port, name, hostname }) => ({
      id,
      ip,
      port,
      name: name || hostname,
    }))(nextMachine);
  } else {
    staticDeploymentResult.continueExecution = false;
  }

  return staticDeploymentResult;
}
/**
 *
 * @param {object} engine instance of the engine class containing all information about the current process and its instances
 * @param {string} processInstanceId id of the specific instance the token is running in
 * @param {string} tokenId the id of the token for which we have to decide where to execute it next
 * @param {string} from the previous executed element
 * @param {string} to the next element to be executed
 * @param {object} machine machine to forward the instance to
 * @returns {boolean} - true if instance was successully forwarded, false if not
 */
async function forwardDynamicInstance(engine, processInstanceId, tokenId, from, to, machine) {
  if (!machine) {
    return false;
  }
  const { ip, port, name } = machine;
  // send process bpmn to next machine
  const instanceInfo = engine.getInstanceInformation(processInstanceId);
  const currentFlowNodeToken = { ...engine.getToken(processInstanceId, tokenId), from, to };
  instanceInfo.tokens = [currentFlowNodeToken];

  const { processVersion } = instanceInfo;
  try {
    await forwardProcess(ip, port, engine.definitionId, processVersion);
  } catch (err) {
    engine._log.info({
      msg: `Error sending process bpmn to next machine: ${err}. InstanceId = ${processInstanceId}`,
      instanceId: processInstanceId,
    });
    return false;
  }

  try {
    await forwardInstance(ip, port, engine.definitionId, processInstanceId, instanceInfo);

    engine._log.info({
      msg: `Forwarding token execution to another machine ${name}. TokenId = ${instanceInfo.tokens[0].tokenId}. InstanceId = ${processInstanceId}`,
      instanceId: processInstanceId,
    });
  } catch (err) {
    engine._log.info({
      msg: `Unable to forward process to next machine ${name}. TokenId = ${instanceInfo.tokens[0].tokenId}. InstanceId = ${processInstanceId}`,
      instanceId: processInstanceId,
    });
    return false;
  }

  return true;
}

/**
 * Reevaluate after timer expired to find the optimal next machine to continue execution of the current token
 *
 * @param {object} engine instance of the engine class containing all information about the current process and its instances
 * @param {string} processInstanceId id of the specific instance the token is running in
 * @param {object} processInfo object with information about the executed process
 * @param {string} tokenId the id of the token for which we have to decide where to execute it next
 * @param {string} from the previous executed element
 * @param {string} to the next element to be executed
 * @returns {dynamicDeploymentResult} holding information about continuation of execution
 */
async function reEvaluateDynamicDeployment(
  engine,
  processInstanceId,
  processInfo,
  tokenId,
  from,
  to,
) {
  let dynamicDeploymentResult = {
    engineList: [],
    abortCheck: {
      stopProcess: null,
      unfulfilledConstraints: [],
    },
  };

  const reEvaluateTimer = await config.readConfig('router.reEvaluateTimer');

  const parser = new Parser();
  const bpmn = engine.getInstanceBpmn(processInstanceId);

  const processConstraints = parser.getConstraints(bpmn);
  const taskConstraints = parser.getConstraints(bpmn, to);

  return new Promise((resolve) => {
    // after timer, call evaluation again
    setTimeout(async () => {
      const processInstanceInfo = engine.getInstanceInformation(processInstanceId);
      const token = engine.getToken(processInstanceId, tokenId);

      const tokenInfo = {
        globalStartTime: processInstanceInfo.globalStartTime,
        localStartTime: token.localStartTime,
        localExecutionTime: token.localExecutionTime,
        machineHops: token.machineHops,
        storageRounds: token.deciderStorageRounds + 1,
        storageTime: token.deciderStorageTime + reEvaluateTimer,
      };

      engine.updateToken(processInstanceId, tokenId, {
        deciderStorageRounds: token.deciderStorageRounds + 1,
        deciderStorageTime: token.deciderStorageTime + reEvaluateTimer,
      });

      let reEvaluationResult;
      reEvaluationResult = await decider.findOptimalNextMachine(
        processInfo,
        tokenInfo,
        taskConstraints.processConstraints || {},
        processConstraints.processConstraints || {},
      );
      // recursively call reEvaluation again if still no engines found
      if (
        reEvaluationResult.engineList.length === 0 &&
        reEvaluationResult.abortCheck.stopProcess === null
      ) {
        reEvaluationResult = await reEvaluateDynamicDeployment(
          engine,
          processInstanceId,
          processInfo,
          tokenId,
          from,
          to,
        );
      }
      resolve(reEvaluationResult);
    }, reEvaluateTimer);
  });
}
/**
 * Uses the decider module to find the optimal next machine to continue execution of the current token
 *
 * @param {object} engine instance of the engine class containing all information about the current process and its instances
 * @param {string} processInstanceId id of the specific instance the token is running in
 * @param {object} processInfo - information about the running process
 * @param {string} tokenId the id of the token for which we have to decide where to execute it next
 * @param {string} from the previous executed element
 * @param {string} to the next element to be executed
 * @returns {dynamicDeploymentResult} holding information about continuation of execution
 */
async function evaluateDynamicDeployment(
  engine,
  processInstanceId,
  processInfo,
  tokenId,
  from,
  to,
) {
  let dynamicDeploymentResult = {
    engineList: [],
    abortCheck: {
      stopProcess: null,
      unfulfilledConstraints: [],
    },
  };

  const parser = new Parser();
  const bpmn = engine.getInstanceBpmn(processInstanceId);
  // parse constraints from process definition
  const processConstraints = parser.getConstraints(bpmn);
  const taskConstraints = parser.getConstraints(bpmn, to);
  const previousTaskConstraints = parser.getConstraints(bpmn, from);

  const processInstanceInfo = engine.getInstanceInformation(processInstanceId);
  const currentFlowNodeToken = engine.getToken(processInstanceId, tokenId);

  const previousExecution = processInstanceInfo.log
    .filter(
      (execution) =>
        execution.flowElementId === from &&
        (execution.tokenId.includes(tokenId) || tokenId.includes(execution.tokenId)),
    )
    .pop();

  const tokenInfo = {
    globalStartTime: processInstanceInfo.globalStartTime,
    localStartTime: currentFlowNodeToken.localStartTime,
    localExecutionTime: currentFlowNodeToken.localExecutionTime,
    machineHops: currentFlowNodeToken.machineHops,
    storageRounds: currentFlowNodeToken.deciderStorageRounds,
    storageTime: currentFlowNodeToken.deciderStorageTime,
  };

  // first check if previous execution was valid -> abort instance or token if not
  const previousExecutionCheck = await decider.preCheckAbort(
    processInfo,
    {
      ...tokenInfo,
      flowNodeTime: previousExecution
        ? previousExecution.endTime - previousExecution.startTime
        : null,
    },
    previousTaskConstraints.hardConstraints || [],
    processConstraints.hardConstraints || [],
  );

  // stop process because previous execution was not valid
  if (previousExecutionCheck.stopProcess !== null) {
    dynamicDeploymentResult.abortCheck = previousExecutionCheck;
    return dynamicDeploymentResult;
  }
  // decide where to move the execution using the decider
  dynamicDeploymentResult = await decider.findOptimalNextMachine(
    processInfo,
    tokenInfo,
    taskConstraints.processConstraints || {},
    processConstraints.processConstraints || {},
  );

  // reEvaluation because no fitting engine found
  if (
    dynamicDeploymentResult.abortCheck.stopProcess === null &&
    dynamicDeploymentResult.engineList.length === 0
  ) {
    dynamicDeploymentResult = await reEvaluateDynamicDeployment(
      engine,
      processInstanceId,
      processInfo,
      tokenId,
      from,
      to,
    );
  }

  return dynamicDeploymentResult;
}

module.exports = {
  getShouldPassToken(engine) {
    // should return true if token should be executed on same engine, false if not
    // update token state respectively
    return async function shouldPassToken(processId, processInstanceId, from, to, tokenId, state) {
      // do not continue execution if process is pausing
      if (engine.getInstanceInformation(processInstanceId).instanceState[0] === 'PAUSING') {
        engine.updateToken(processInstanceId, tokenId, { state: 'PAUSED' });
        return false;
      }

      engine.updateToken(processInstanceId, tokenId, { state: 'DEPLOYMENT-WAITING' });

      const processInstance = engine.getInstance(processInstanceId);
      const processDefinition = await toBpmnObject(engine.getInstanceBpmn(processInstanceId));
      const [processElement] = getElementsByTagName(processDefinition, 'bpmn:Process');
      const allFlowElements = await getAllBpmnFlowElements(processElement);
      const nextActivity = allFlowElements.find((element) => element.id === to);
      const deploymentMethod =
        processElement.$attrs['proceed:deploymentMethod'] || processElement.deploymentMethod;

      // get information about the token for which are evaluating
      const currentFlowNodeToken = engine.getToken(processInstanceId, tokenId);

      if (deploymentMethod === 'static') {
        const staticDeploymentResult = await evaluateStaticDeployment(engine, nextActivity);

        const { nextMachine, continueExecution } = staticDeploymentResult;

        if (!continueExecution) {
          engine._log.info({
            msg: `Can't forward process. Next machine is unknown. TokenId = ${tokenId}. InstanceId = ${processInstanceId}`,
            instanceId: processInstanceId,
          });
          processInstance.endToken(tokenId, {
            state: 'ERROR-CONSTRAINT-UNFULFILLED',
            endTime: +new Date(),
            errorMessage: 'Token stopped execution',
          });
          processInstance.updateLog(currentFlowNodeToken.currentFlowElementId, tokenId, {
            machine: engine.machineInformation,
            progress: currentFlowNodeToken.currentFlowNodeProgress,
          });
          return false;
        }

        if (nextMachine) {
          const { ip, port, name } = nextMachine;

          // forwarding the instance
          const instanceInfo = engine.getInstanceInformation(processInstanceId);
          currentFlowNodeToken.from = from;
          currentFlowNodeToken.to = to;
          instanceInfo.tokens = [currentFlowNodeToken];
          try {
            await forwardInstance(ip, port, engine.definitionId, processInstanceId, instanceInfo);

            engine._log.info({
              msg: `Forwarding token execution to another machine ${name}. TokenId = ${tokenId}. InstanceId = ${processInstanceId}`,
              instanceId: processInstanceId,
            });
          } catch (err) {
            engine._log.info({
              msg: `Unable to forward process to next machine ${name}. TokenId = ${tokenId}. InstanceId = ${processInstanceId}`,
              instanceId: processInstanceId,
            });
          }

          engine._log.info({
            msg: `Ending execution for current token. TokenId = ${tokenId}. InstanceId = ${processInstanceId}`,
            instanceId: processInstanceId,
          });

          processInstance.endToken(tokenId, {
            state: 'FORWARDED',
            nextMachine,
            endTime: +new Date(),
          });
          processInstance.updateLog(currentFlowNodeToken.currentFlowElementId, tokenId, {
            machine: engine.machineInformation,
            nextMachine,
          });
          return false;
        }
      } else if (deploymentMethod === 'dynamic') {
        const allUserTaskIds = await distribution.db.getAllUserTasks(
          engine.definitionId,
          undefined,
        );

        const processInfo = {
          id: processId,

          nextFlowNode: {
            id: to,
            isUserTask: !!allUserTaskIds.find((userTaskId) => userTaskId === to),
          },
        };

        // get evaluation result of decider
        let dynamicDeploymentResult = await evaluateDynamicDeployment(
          engine,
          processInstanceId,
          processInfo,
          tokenId,
          from,
          to,
        );

        // try to forward instance (or continue locally) until token/instance has to be aborted
        while (dynamicDeploymentResult.abortCheck.stopProcess === null) {
          let nextMachine = dynamicDeploymentResult.engineList.shift();

          // continue locally
          if (nextMachine.id === 'local-engine') {
            return true;
          }

          if (!nextMachine) {
            // re-evaluate if instance could not be forwarded to another machine
            dynamicDeploymentResult = await reEvaluateDynamicDeployment(
              engine,
              processInstanceId,
              processInfo,
              tokenId,
              from,
              to,
            );

            continue;
          }

          const instanceForwarded = await forwardDynamicInstance(
            engine,
            processInstanceId,
            tokenId,
            from,
            to,
            nextMachine,
          );

          if (instanceForwarded) {
            // mark token as forwarded
            processInstance.endToken(tokenId, {
              state: 'FORWARDED',
              nextMachine,
              endTime: +new Date(),
            });

            processInstance.updateLog(currentFlowNodeToken.currentFlowElementId, tokenId, {
              machine: engine.machineInformation,
              nextMachine,
            });

            return false;
          }
        }

        // stop instance
        if (dynamicDeploymentResult.abortCheck.stopProcess === 'instance') {
          engine._log.info({
            msg: `Can't forward process. Process will be stopped. InstanceId = ${processInstanceId}`,
            instanceId: processInstanceId,
          });

          // end every token locally with state ERROR-CONSTRAINT-UNFULFILLED
          await engine.stopUnfulfilledInstance(
            processInstanceId,
            dynamicDeploymentResult.abortCheck.unfulfilledConstraints,
          );
          return false;
        }

        // stop token
        if (dynamicDeploymentResult.abortCheck.stopProcess === 'token') {
          engine._log.info({
            msg: `Can't forward process. Token will be stopped. TokenId = ${tokenId}. InstanceId = ${processInstanceId}`,
            instanceId: processInstanceId,
          });
          processInstance.endToken(tokenId, {
            state: 'ERROR-CONSTRAINT-UNFULFILLED',
            endTime: +new Date(),
            errorMessage: `Token stopped execution because of: ${dynamicDeploymentResult.abortCheck.unfulfilledConstraints.join(
              ', ',
            )}`,
          });
          processInstance.updateLog(currentFlowNodeToken.currentFlowElementId, tokenId, {
            machine: engine.machineInformation,
            progress: currentFlowNodeToken.currentFlowNodeProgress,
          });
          return false;
        }
      }

      return true;
    };
  },
};
