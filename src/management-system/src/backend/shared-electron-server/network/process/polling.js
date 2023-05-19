import PollingHandler from '../../helpers/polling-handler.js';

import {
  getDeployments as getStoredDeployments,
  updateDeployment,
  removeDeployment as removeStoredDeployment,
  getActiveUserTasks as getStoredActiveUserTasks,
  updateActiveUserTasks,
  removeActiveUserTask as removeStoredActiveUserTask,
  getInstances as getStoredInstances,
  updateInstance,
  removeInstance as removeStoredInstance,
} from '../../data/deployment.js';

import { processMetaObjects, removeProcess } from '../../data/process.js';

import { getBackendConfig } from '../../data/config.js';

import { getMachines } from '../../data/machines.js';

import { checkAvailability } from '../machines/machineInfoRequests.js';

import { asyncMap } from '../../../../shared-frontend-backend/helpers/javascriptHelpers.js';

import { processEndpoint } from '../ms-engine-communication/module.js';

import logger from '../../logging.js';

import eventHandler from '../../../../frontend/backend-api/event-system/EventHandler.js';

/******************************* Deployment Polling and Merging *******************************/

/**
 * Request deployment information from every connected machine
 * @returns {Promise<void[]>} Resolves if all deployment information was requested
 */
export async function getDeploymentInfoFromKnownMachines() {
  const connectedMachines = getMachines().filter((machine) => machine.status === 'CONNECTED');

  const machinesDeployments = await asyncMap(connectedMachines, async (machine) => {
    const deployments = {};
    try {
      // only try to poll machines that are reachable
      const running = await checkAvailability(machine);
      if (running) {
        // get the information about all deployments on the machine (including the instances for each deployment and the active instances)
        let deployedProcesses = await processEndpoint.getDeployedProcesses(
          machine,
          'definitionId,versions,instances(processInstanceId,processVersion,instanceState,globalStartTime)'
        );

        deployedProcesses.forEach((process) => (deployments[process.definitionId] = process));
      }
    } catch (err) {
      const { optionalName, hostname, id, name } = machine;
      logger.info(
        `Could not request deployment information for machine: ${
          optionalName || name || hostname || id
        }.`
      );
    }

    // return the deployment information with information about the associated machine
    return [machine, deployments];
  });

  // filter machines where the request failed
  return machinesDeployments.filter((machineDeployments) => Object.keys(machineDeployments).length);
}

/**
 * Used to check if an instance is still being executed based on its state
 *
 * @param {string[]} instanceState
 * @returns {boolean} true if the state contains an entry that indicates that the instance is still being executed
 */
function isInstanceStillRunning(instanceState) {
  return !!instanceState.find(
    (state) =>
      state === 'RUNNING' ||
      state === 'READY' ||
      state === 'DEPLOYMENT-WAITING' ||
      state === 'PAUSING' ||
      state === 'PAUSED'
  );
}

/**
 * Merges the deployments of all machines into one consolidated list
 *
 * @param {Array} machinesDeployments contains information for each known and connected machine about the deployment information for that machine
 * @returns {Object} the consolidated list of all deployments
 */
export function mergeDeployments(storedDeployments = {}, machinesDeployments) {
  const deployments = JSON.parse(JSON.stringify(storedDeployments));

  machinesDeployments.forEach(([machine, machineDeployments]) => {
    Object.values(machineDeployments).forEach((machineDeployment) => {
      if (!deployments[machineDeployment.definitionId]) {
        // deployment does not exist => add the deployment to the list
        deployments[machineDeployment.definitionId] = {
          ...machineDeployment,
          machines: [],
          versions: [],
          instances: {},
          runningInstances: {},
        };
        // setup information about the machines the deployment exists on
      }

      const deployment = deployments[machineDeployment.definitionId];

      // add information about the machines the deployment exists on
      if (!deployment.machines.some((knownMachine) => knownMachine.id === machine.id)) {
        deployment.machines.push(machine);
      }

      // add information about newly found versions if necessary
      machineDeployment.versions.forEach((machineVersionInfo) => {
        const knownVersion = deployment.versions.find(
          ({ version }) => version == machineVersionInfo.version
        );

        // check if there is an entry for the version
        if (knownVersion) {
          if (!knownVersion.machines.some((machineInfo) => machine.id === machineInfo.machineId)) {
            // add the information that the version can be found on the current machine if it does not exist yet
            knownVersion.machines.push({
              machineId: machine.id,
              needs: machineVersionInfo.needs,
              deploymentDate: machineVersionInfo.deploymentDate,
            });
          }
        } else {
          // add a version entry if none exists yet
          const extendedVersion = {
            ...machineVersionInfo,
            deploymentDate: undefined,
            needs: undefined,
            machines: [
              {
                machineId: machine.id,
                needs: machineVersionInfo.needs,
                deploymentDate: machineVersionInfo.deploymentDate,
              },
            ],
          };
          // remove deploymentDate and needs from the global version information (they are machine specific)
          delete extendedVersion.deploymentDate;
          delete extendedVersion.needs;

          deployment.versions.push(extendedVersion);
        }
      });

      // merge the instance lists from different machines
      machineDeployment.instances.forEach(
        ({ processInstanceId, processVersion, instanceState, globalStartTime }) => {
          if (!deployment.instances[processInstanceId]) {
            // add a new instance entry with the initial info from the current machine if no entry exists yet for the instance
            deployment.instances[processInstanceId] = {
              processInstanceId,
              globalStartTime,
              processVersion,
              machines: [machine.id],
            };
          } else if (!deployment.instances[processInstanceId].machines.includes(machine.id)) {
            // add the information that the machine is involved in the execution of the instance if necessary
            deployment.instances[processInstanceId].machines.push(machine.id);
          }

          // make sure that the used version is always up to date (should be the same on all machines)
          deployment.instances[processInstanceId].processVersion = processVersion;

          // add the instance to the list of running instances if necessary and remember the machine the instance is still running on
          if (isInstanceStillRunning(instanceState)) {
            if (!deployment.runningInstances[processInstanceId]) {
              deployment.runningInstances[processInstanceId] = [machine.id];
            } else if (!deployment.runningInstances[processInstanceId].includes(machine.id)) {
              deployment.runningInstances[processInstanceId].push(machine.id);
            }
          } else {
            // make sure to remove the machine from the list of machines the instance is still running on
            if (
              deployment.runningInstances[processInstanceId] &&
              deployment.runningInstances[processInstanceId].includes(machine.id)
            ) {
              deployment.runningInstances[processInstanceId] = deployment.runningInstances[
                processInstanceId
              ].filter((machineId) => machineId !== machine.id);
              if (!deployment.runningInstances[processInstanceId].length) {
                // remove the instance from the list of running instances if it is not running on any machine
                delete deployment.runningInstances[processInstanceId];
              }
            }
          }
        }
      );
    });
  });

  // make sure that a deployment is removed from the stored list if it was removed from all machines
  const removedDeployments = Object.entries(deployments)
    .filter(([definitionId, info]) => {
      // remove machines that do not store the deployment anymore
      info.machines = info.machines.filter((machine) => {
        // check if there is current deployment information for this machine but this deployment was removed
        const machineDeployments = machinesDeployments.find(
          ([dMachine]) => dMachine.id === machine.id
        );

        // if there is deployment info for the machine but no info for the specific deployment assume it was removed
        if (machineDeployments && !machineDeployments[1][definitionId]) {
          return false;
        }

        return true;
      });

      // remove versions that were removed from all machines that we knew stored them before
      info.versions = info.versions.filter((version) => {
        // remove machine information from version if the version is not deployed to the machine anymore since the deployment was removed
        version.machines = version.machines.filter(({ machineId }) =>
          info.machines.some((machine) => machine.id === machineId)
        );

        return version.machines.length;
      });

      // remove instances that were removed from all machines that we knew stored them before
      info.instances = Object.fromEntries(
        Object.entries(info.instances).filter(([_instanceId, instance]) => {
          instance.machines = instance.machines.filter((machineId) =>
            info.machines.some((machine) => machine.id === machineId)
          );

          return instance.machines.length;
        })
      );

      // remove entries from runningInstances list if the deployment was removed from a machine that was the last one where the instance was still running
      info.runningInstances = Object.fromEntries(
        Object.entries(info.runningInstances)
          // filter the machines from the entry that don't store the deployment anymore
          .map(([instanceId, machineIds]) => [
            instanceId,
            machineIds.filter((machineId) =>
              info.machines.some((machine) => machine.id === machineId)
            ),
          ])
          .filter(([_, machineIds]) => machineIds.length)
      );

      return !info.machines.length;
    })
    .map(([definitionId, _]) => definitionId);

  removedDeployments.forEach((deploymentId) => delete deployments[deploymentId]);

  return { deployments, removedDeployments };
}

// Handles the continuous polling of deployment data from the engines
let deploymentPollingHandler = null;

// apply the new deployment polling interval to a potentially already existing deployment polling handler
eventHandler.on('backendConfigChange.deploymentsPollingInterval', ({ newValue }) => {
  if (deploymentPollingHandler) {
    deploymentPollingHandler.changePollingInterval(1000 * newValue);
  }
});

/**
 * Force an update to the information of an instance (will circumvent the polling timeout)
 */
export async function immediateDeploymentInfoRequest() {
  if (deploymentPollingHandler) {
    await deploymentPollingHandler.skipWaiting();
  }
}

let deploymentCleanupHandler = null;

/**
 * Will trigger the continuous polling of deployment information from all known machines
 */
export async function pollDeploymentInfoFromKnownMachines() {
  if (!deploymentPollingHandler) {
    // prevent deployment data from being removed if there is a pending removal timeout
    if (deploymentCleanupHandler) {
      clearTimeout(deploymentCleanupHandler);
      deploymentCleanupHandler = null;
    }

    deploymentPollingHandler = new PollingHandler(
      async () => {
        const machinesDeployments = await getDeploymentInfoFromKnownMachines();
        return mergeDeployments(getStoredDeployments(), machinesDeployments);
      },
      getBackendConfig().deploymentsPollingInterval * 1000,
      ({ deployments, removedDeployments }) => {
        Object.entries(deployments).forEach(([processDefinitionsId, deploymentInfo]) => {
          updateDeployment(processDefinitionsId, deploymentInfo);
        });

        removedDeployments.forEach((definitionId) => {
          removeStoredDeployment(definitionId);
          // remove potentially existing instance adaptation processes
          Object.keys(processMetaObjects)
            .filter((key) => key.startsWith(`${definitionId}-instance-`))
            .forEach((key) => removeProcess(key));
        });
      }
    );
  }
}

/**
 * Will stop the polling of deployment data from all known machines
 */
export async function stopPollingDeploymentInfo() {
  if (deploymentPollingHandler) {
    deploymentPollingHandler.stopPolling();
    deploymentPollingHandler = null;

    // remove the deployment data if it is not needed anymore
    if (!deploymentCleanupHandler) {
      deploymentCleanupHandler = setTimeout(() => {
        Object.keys(getStoredDeployments()).forEach((deploymentId) => {
          // deployment information of projects should be kept as long as the project exists; all other deployment information should be deleted
          if (
            !processMetaObjects[deploymentId] ||
            processMetaObjects[deploymentId].type !== 'project'
          ) {
            logger.debug(
              `Removing deployment (id: ${deploymentId}) since no client needs information about it.`
            );
            removeStoredDeployment(deploymentId);
            deploymentCleanupHandler = null;
          }
        });
      }, getBackendConfig().deploymentStorageTime * 1000);
    }
  }
}

/******************************* Active User Task Polling and Merging *******************************/

/**
 * Request active user tasks including its html from every connected machine
 * @returns {Promise<void[]>} Resolves if all active usertasks were requested
 */
export async function getActiveUserTasksFromKnownMachines() {
  const connectedMachines = getMachines().filter((machine) => machine.status === 'CONNECTED');

  const machinesActiveUserTasksWithHtml = await asyncMap(connectedMachines, async (machine) => {
    let activeUserTasksWithHtml = [];
    try {
      // only try to poll machines that are reachable
      const running = await checkAvailability(machine);
      if (running) {
        // get the information about all active user tasks on the machine
        const activeUserTasks = await processEndpoint.getActiveUserTasks({
          host: machine.ip,
          port: machine.port,
        });

        activeUserTasksWithHtml = await asyncMap(activeUserTasks, async (userTask) => {
          // get html for each active user task
          const html = await processEndpoint.getActiveUserTaskHTML(
            {
              host: machine.ip,
              port: machine.port,
            },
            userTask.instanceID,
            userTask.id
          );
          return { ...userTask, html, machine };
        });
      }
    } catch (err) {
      const { optionalName, hostname, id, name } = machine;
      logger.info(
        `Could not request active User Tasks for machine: ${
          optionalName || name || hostname || id
        }.`
      );
    }

    // return the active userTasks including Html with information about the associated machine
    return activeUserTasksWithHtml;
  });

  // filter machines where the request failed
  return machinesActiveUserTasksWithHtml
    .filter((machineActiveUserTasksWithHtml) => Object.keys(machineActiveUserTasksWithHtml).length)
    .flat();
}

/**
 * Merges the active user tasks of all machines into one consolidated list
 *
 * @param {Array} machinesActiveUserTasks contains information for each known and connected machine about the active user tasks for that machine
 * @returns {Object} the consolidated list of all active user tasks
 */
export function mergeActiveUserTasks(storedActiveUserTasks = {}, machinesActiveUserTasks) {
  let activeUserTasks = JSON.parse(JSON.stringify(storedActiveUserTasks));

  machinesActiveUserTasks.forEach((activeUserTask) => {
    const activeUserTaskStoredIndex = activeUserTasks.findIndex(
      (uT) => uT.instanceID === activeUserTask.instanceID && uT.id === activeUserTask.id
    );

    if (activeUserTaskStoredIndex !== -1) {
      activeUserTasks.splice(activeUserTaskStoredIndex, 1, activeUserTask);
    } else {
      activeUserTasks.push(activeUserTask);
    }
  });

  activeUserTasks = activeUserTasks.filter((activeUserTask) => {
    const userTaskStillActive = !!machinesActiveUserTasks.find(
      (uT) => uT.instanceID === activeUserTask.instanceID && uT.id === activeUserTask.id
    );

    return userTaskStillActive;
  });

  return activeUserTasks;
}

// Handles the continuous polling of active user tasks from the engines
let activeUserTaskPollingHandler = null;

// apply the new activeUserTask polling interval to a potentially already existing activeUserTask polling handler
eventHandler.on('backendConfigChange.activeUserTasksPollingInterval', ({ newValue }) => {
  if (activeUserTaskPollingHandler) {
    activeUserTaskPollingHandler.changePollingInterval(1000 * newValue);
  }
});

let activeUserTaskCleanupHandler = null;

/**
 * Will trigger the continuous polling of active user tasks from all known machines
 */
export async function pollActiveUserTasksFromKnownMachines() {
  if (!activeUserTaskPollingHandler) {
    // prevent deployment data from being removed if there is a pending removal timeout
    if (activeUserTaskCleanupHandler) {
      clearTimeout(activeUserTaskCleanupHandler);
      activeUserTaskCleanupHandler = null;
    }

    activeUserTaskPollingHandler = new PollingHandler(
      async () => {
        const machinesActiveUserTasks = await getActiveUserTasksFromKnownMachines();
        return mergeActiveUserTasks(getStoredActiveUserTasks(), machinesActiveUserTasks);
      },
      getBackendConfig().activeUserTasksPollingInterval * 1000,
      (activeUserTasks) => {
        updateActiveUserTasks(activeUserTasks);
      }
    );
  }
}

/**
 * Will stop the polling of active user tasks from all known machines
 */
export async function stopPollingActiveUserTasks() {
  if (activeUserTaskPollingHandler) {
    activeUserTaskPollingHandler.stopPolling();
    activeUserTaskPollingHandler = null;

    // remove the deployment data if it is not needed anymore
    if (!activeUserTaskCleanupHandler) {
      activeUserTaskCleanupHandler = setTimeout(() => {
        getStoredActiveUserTasks().forEach((activeUserTask) => {
          logger.debug(
            `Removing active User Task (id: ${activeUserTask.id}, instanceID: ${activeUserTask.instanceID}) since no client needs information about it.`
          );
          removeStoredActiveUserTask(activeUserTask.instanceID, activeUserTask.id);
          activeUserTaskCleanupHandler = null;
        });
      }, getBackendConfig().activeUserTaskStorageTime * 1000);
    }
  }
}

/******************************* Instance Polling and Merging *******************************/

const statePrecedence = [
  'STOPPED',
  'PAUSING',
  'PAUSED',
  'RUNNING',
  'READY',
  'FORWARDED',
  'DEPLOYMENT-WAITING',
  'ABORTED',
  'FAILED',
  'TERMINATED',
  'ERROR-SEMANTIC',
  'ERROR-TECHNICAL',
  'ERROR-CONSTRAINT-UNFULFILLED',
  'ENDED',
];

/**
 * Will create a consolidated instance state from the instance states on multiple machines and the consolidated tokens
 *
 * @param {object} storedInstanceData the current consolidated instance state
 * @param {object} machineInstanceData the instance state on the current machine
 */
function mergeInstanceState(storedInstanceData, machineInstanceData) {
  // If the instance is in a special user specified state use that state otherwise compute the state from the token states
  if (
    storedInstanceData.instanceState[0] === 'STOPPED' ||
    machineInstanceData.instanceState[0] === 'STOPPED'
  ) {
    storedInstanceData.instanceState = ['STOPPED'];
  } else if (
    storedInstanceData.instanceState[0] === 'PAUSING' ||
    machineInstanceData.instanceState[0] === 'PAUSING'
  ) {
    // as long as at least one machine is still in a pausing state show pausing event if all others are already paused
    storedInstanceData.instanceState = ['PAUSING'];
  } else if (
    storedInstanceData.instanceState[0] === 'PAUSED' ||
    machineInstanceData.instanceState[0] === 'PAUSED'
  ) {
    storedInstanceData.instanceState = ['PAUSED'];
  } else {
    // create the instanceState entry from the token states on all machines
    storedInstanceData.instanceState = storedInstanceData.tokens
      .map((token) => token.state)
      .reduce((finalStateList, state) => {
        const newStateList = [...finalStateList];

        // don't add a state that is already included in the list
        if (!newStateList.includes(state)) {
          newStateList.push(state);
        }

        return newStateList;
      }, []);
  }
}

/**
 * Will create a consolidated token state from the token information on multiple machines
 *
 * @param {object} storedInstanceData the current consolidated instance state
 * @param {object} machineInstanceData the instance state on the current machine
 */
function mergeInstanceTokens(storedInstanceData, machineInstanceData) {
  storedInstanceData.tokens = machineInstanceData.tokens.reduce((mergedTokens, machineToken) => {
    let newMergedTokens = [...mergedTokens];

    // prevent problems with evaluation for some tokens that might not have a machineHops attribute
    machineToken.machineHops = machineToken.machineHops || 0;

    /**
     * get all tokens that might be related to the current one
     *
     * will most of the time be the same token with older/newer information
     *
     * might be child tokens of the token in case of splits/merges at gateways
     *
     */
    const knownTokenIndices = [];
    newMergedTokens.forEach((storedToken, index) => {
      const isSameToken = machineToken.tokenId === storedToken.tokenId;
      // tokens that were split/merged from other tokens should not exist at the same time as the original tokens
      // TODO: it is possible that there are edge cases which are not covered by the following rules
      const isGatewayChildToken = machineToken.tokenId.startsWith(`${storedToken.tokenId}|`);
      const isGatewayParentToken = storedToken.tokenId.startsWith(`${machineToken.tokenId}|`);
      const isMergedFromUnrelatedTokens =
        machineToken.tokenId.includes('_') && machineToken.tokenId.includes(storedToken.tokenId);
      if (
        isSameToken ||
        isGatewayChildToken ||
        isGatewayParentToken ||
        isMergedFromUnrelatedTokens
      ) {
        knownTokenIndices.push(index);
      }
    });

    if (!knownTokenIndices.length) {
      // add token if it is not stored in the consolidated instance object yet
      newMergedTokens.push(machineToken);
    } else {
      let oldNewMergedTokens = newMergedTokens;

      // check if some of the currently stored tokens should be replaced by the incoming token
      newMergedTokens = newMergedTokens.filter(
        (storedToken, index) =>
          !(
            knownTokenIndices.includes(index) && storedToken.machineHops <= machineToken.machineHops
          )
      );

      // the previously stored information was older => add the new info
      if (oldNewMergedTokens.length > newMergedTokens.length) {
        newMergedTokens.push(machineToken);
      }
    }

    return newMergedTokens;
  }, storedInstanceData.tokens);
}

/**
 * Helper function that will take two log arrays and merge the second into the first
 *
 * @param {Array} storedLog the log array that should be merged into
 * @param {Array} machineLog the incoming log array that should be merged
 * @param {Array} logIdentifiers a list of identifiers that should be used to identify duplicate entries
 */
function mergeLogs(storedLog, machineLog, logIdentifiers) {
  // merge log entries into one log array
  storedLog = machineLog.reduce((curr, newEntry) => {
    // make sure that an entry is only added once (machine might have been polled before, forwarded instances contain logs that exist on the original engine)
    if (
      !curr.some((entry) =>
        logIdentifiers.every((identifier) => entry[identifier] === newEntry[identifier])
      )
    ) {
      curr.push(newEntry);
    }

    return curr;
  }, storedLog);
}

/**
 * Creates a consolidated log entry with the data from multiple machines
 *
 * @param {object} storedInstanceData the current consolidated instance state
 * @param {object} machineInstanceData the instance state on the current machine
 */
function mergeInstanceLogs(storedInstanceData, machineInstanceData) {
  mergeLogs(storedInstanceData.log, machineInstanceData.log, ['tokenId', 'endTime']);

  // sort the entries by their creation time
  storedInstanceData.log.sort((a, b) => a.endTime - b.endTime);
}
/**
 * Creates a consolidated adaptationLog entry with the data from multiple machines
 *
 * @param {object} storedInstanceData the current consolidated instance state
 * @param {object} machineInstanceData the instance state on the current machine
 */
function mergeInstanceAdaptationLogs(storedInstanceData, machineInstanceData) {
  mergeLogs(storedInstanceData.adaptationLog, machineInstanceData.adaptationLog, [
    'tokenId',
    'time',
  ]);

  storedInstanceData.adaptationLog.sort((a, b) => a.time - b.time);
}
/**
 * Creates a consolidated variables entry with the data from multiple machines
 *
 * @param {object} storedInstanceData the current consolidated instance state
 * @param {object} machineInstanceData the instance state on the current machine
 */
function mergeInstanceVariables(storedInstanceData, machineInstanceData) {
  Object.entries(machineInstanceData.variables).forEach(([variableName, machineVariableInfo]) => {
    if (storedInstanceData.variables[variableName]) {
      const storedVariableData = storedInstanceData.variables[variableName];
      // use the new value if the latest change on the machine is newer than the latest change from the stored data
      if (
        storedVariableData.log[storedVariableData.log.length - 1].changedTime <
        machineVariableInfo.log[machineVariableInfo.log.length - 1].changedTime
      ) {
        storedVariableData.value = machineVariableInfo.value;
      }

      mergeLogs(storedVariableData.log, machineVariableInfo.log, ['changedBy', 'changedTime']);
    } else {
      storedInstanceData.variables[variableName] = machineVariableInfo;
    }

    storedInstanceData.variables[variableName].log.sort((a, b) => a.changedTime - b.changedTime);
  });
}

/**
 * Merge the instance data that was returned by a machine into the consolidated state
 *
 * @param {Object} storedInstanceData the currently stored data for the instance
 * @param {Object} machineInstanceData the instance state on the machine
 */
function mergeMachineInstanceDataIntoConsolidatedState(storedInstanceData, machineInstanceData) {
  mergeInstanceLogs(storedInstanceData, machineInstanceData);
  mergeInstanceAdaptationLogs(storedInstanceData, machineInstanceData);
  mergeInstanceVariables(storedInstanceData, machineInstanceData);

  mergeInstanceTokens(storedInstanceData, machineInstanceData);

  // remove tokens that were manually removed according to the adaptationLog
  storedInstanceData.adaptationLog.forEach((entry) => {
    if (entry.type === 'TOKEN-REMOVE') {
      storedInstanceData.tokens = storedInstanceData.tokens.filter(
        (token) => token.tokenId !== entry.tokenId
      );
    }
  });

  mergeInstanceState(storedInstanceData, machineInstanceData);
  // we expect every machine to use the same version, but the version might have changed from the last time the instance data was stored
  // TODO: this might lead to problems that reappear after they were offline during the migration of an instance
  // maybe better to check the migration entries in the consolidated adaptationLog and use the version from the latest migration
  storedInstanceData.processVersion = machineInstanceData.processVersion;
}

/**
 * Merges the instance data from multiple machines into one consolidated instance state
 *
 * @param {Object} storedInstanceData the current state of the consolidated instance data
 * @param {Object} machineInstanceData the instance data from one machine
 * @param {String} machineId the id of the machine the instance came from
 */
export function mergeInstanceInformation(storedInstanceData, machinesInstanceInformation) {
  machinesInstanceInformation.forEach((info) => {
    if (!storedInstanceData) {
      storedInstanceData = info;
    } else {
      storedInstanceData.instanceState = [];
      mergeMachineInstanceDataIntoConsolidatedState(storedInstanceData, info);
    }
  });

  if (storedInstanceData) {
    storedInstanceData.instanceState.sort((firstState, secondState) => {
      let firstStateIndex = statePrecedence.findIndex((state) => state === firstState);
      let secondStateIndex = statePrecedence.findIndex((state) => state === secondState);

      return firstStateIndex - secondStateIndex;
    });
  }

  return storedInstanceData;
}

/**
 * Requests the information of an instance from multiple machines
 *
 * @param {String} definitionId
 * @param {String} instanceId
 * @param {Object[]} machines
 * @returns {Object[]} list containing the instance information for the requested instance from each machine
 */
async function getInstanceInformationFromMachines(definitionId, instanceId, machines) {
  // get the instance information from every machine the instance is executed on
  const machinesInstanceInformation = await asyncMap(machines, async (machine) => {
    try {
      const machineInstanceInfo = await processEndpoint.getInstanceInformation(
        machine,
        definitionId,
        instanceId
      );

      // add machine id so we know which machine this token exists on
      machineInstanceInfo.tokens = machineInstanceInfo.tokens.map((token) => ({
        ...token,
        machineId: machine.id,
      }));

      // this entry serves no purpose in the consolidated state
      delete machineInstanceInfo.isCurrentlyExecutedInBpmnEngine;

      return machineInstanceInfo;
    } catch (err) {
      const { optionalName, hostname, id, name } = machine;
      logger.info(
        `Could not request instance information for instance ${instanceId} on machine: ${
          optionalName || name || hostname || id
        }.`
      );

      return undefined;
    }
  });

  // remove machine entries where the machine was not reachable
  return machinesInstanceInformation.filter((info) => !!info);
}

// Contains handlers which poll information of specific instances from involved machines
let instancesPollingHandlers = {};
let instanceCleanupTimeouts = {};

// apply the new instance polling interval to all already existing instance polling handlers
eventHandler.on('backendConfigChange.instancePollingInterval', ({ newValue }) => {
  Object.values(instancesPollingHandlers).forEach((handler) => {
    handler.changePollingInterval(newValue * 1000);
  });
});

export async function immediateInstanceInfoRequest(instanceId) {
  if (instancesPollingHandlers[instanceId]) {
    await instancesPollingHandlers[instanceId].skipWaiting();
  }
}

/**
 * Will trigger the continuous polling of information for a specific instance from all known machines
 */
// TODO: try to get instance information from machines that are not stored or discovered if the instance was moved there (e.g. add machines an instance was forwarded to to the machines list in the respective deployment)
export async function pollInstanceInfoFromKnownMachines(definitionId, instanceId) {
  if (!instancesPollingHandlers[instanceId]) {
    // prevent the instance from being deleted by a cleanup timeout that is still pending
    if (instanceCleanupTimeouts[instanceId]) {
      clearTimeout(instanceCleanupTimeouts[instanceId]);
      delete instanceCleanupTimeouts[instanceId];
    }

    instancesPollingHandlers[instanceId] = new PollingHandler(
      async () => {
        // TODO: only request the information from machines on which a change might have happened (deployment.runningInstances includes machine; machine was just removed from deployment.runningInstances)
        const deployment = getStoredDeployments()[definitionId];
        if (deployment) {
          const machines = deployment.machines.filter((machine) =>
            deployment.instances[instanceId].machines.includes(machine.id)
          );

          const machinesInstanceInformation = await getInstanceInformationFromMachines(
            definitionId,
            instanceId,
            machines
          );

          return mergeInstanceInformation(
            JSON.parse(JSON.stringify(getStoredInstances()[instanceId] || null)),
            machinesInstanceInformation
          );
        }
      },
      getBackendConfig().instancePollingInterval * 1000,
      (newInstanceInformation) => {
        updateInstance(instanceId, newInstanceInformation);
      }
    );
  }
}

/**
 * Will stop the polling of instance data from all known machines
 */
export async function stopPollingInstanceInfo(instanceId) {
  if (instancesPollingHandlers[instanceId]) {
    instancesPollingHandlers[instanceId].stopPolling();
    delete instancesPollingHandlers[instanceId];

    const instance = getStoredInstances()[instanceId];

    if (instance) {
      // register a timeout that will cleanup the instance data when no client needs it anymore (only if the instance does not belong to a locally known project)
      if (!instanceCleanupTimeouts[instanceId]) {
        if (
          !processMetaObjects[instance.processId] ||
          processMetaObjects[instance.processId].type !== 'project'
        ) {
          instanceCleanupTimeouts[instanceId] = setTimeout(() => {
            logger.debug(
              `Removing instance (id: ${instanceId}) since no client needs information about it.`
            );
            removeStoredInstance(instanceId);
            delete instanceCleanupTimeouts[instanceId];
          }, getBackendConfig().instanceStorageTime * 1000);
        }
      }
    }
  }
}
