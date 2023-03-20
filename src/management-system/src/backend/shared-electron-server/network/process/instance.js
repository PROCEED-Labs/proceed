import { processEndpoint, _5thIndustryEndpoint } from '../ms-engine-communication/module.js';

import {
  getDeployments,
  getInstances,
  getActiveUserTasks,
  removeActiveUserTask,
} from '../../data/deployment.js';

import { immediateDeploymentInfoRequest, immediateInstanceInfoRequest } from './polling.js';

import {
  start5thIndustryPlan,
  stop5thIndustryPlan,
  get5thIndustryServiceAccountData,
  get5thIndustryAuthorization,
} from '../5thIndustry/5thIndustry.js';

import { logger, getProcessVersionBpmn } from './helpers.js';
import { dynamicDeployment } from './deployment.js';

import bpmnEx from '@proceed/bpmn-helper';
const {
  toBpmnObject,
  getElementsByTagName,
  getElementMachineMapping,
  getStartEvents,
  getMetaDataFromElement,
} = bpmnEx;

import { asyncForEach } from '../../../../shared-frontend-backend/helpers/javascriptHelpers.js';

export async function completeUserTask(instanceId, userTaskId) {
  // we might deduce the machine from the active user task info or the instance info
  const userTask = getActiveUserTasks().find((uT) => uT.id === userTaskId);
  const instance = getInstances()[instanceId];

  let machine;
  if (userTask) {
    // get the machine from the user task info
    ({ machine } = userTask);
  } else if (instance) {
    // get the machine through the instance and deployment info
    const token = instance.tokens.find((t) => t.currentFlowElementId === userTaskId);
    if (token) {
      const deployment = getDeployments()[instance.processId];
      machine = deployment.machines.find((m) => m.id === token.machineId);
    }
  } else {
    throw new Error(
      'Could neither find user task or instance info to deduce machine to complete the user task on.'
    );
  }

  if (machine) {
    await processEndpoint.completeUserTask(
      { host: machine.host || machine.ip, port: machine.port },
      instanceId,
      userTaskId
    );

    if (instance) {
      immediateInstanceInfoRequest(instanceId);
    }
  }
}

export async function updateUserTaskMilestone(instanceId, userTaskId, milestone) {
  const { machine } = getActiveUserTasks().find((uT) => uT.id === userTaskId);

  await processEndpoint.updateUserTaskMilestone(
    { host: machine.host || machine.ip, port: machine.port },
    instanceId,
    userTaskId,
    milestone
  );
}
export async function updateUserTaskIntermediateVariablesState(instanceId, userTaskId, variable) {
  const { machine } = getActiveUserTasks().find((uT) => uT.id === userTaskId);

  await processEndpoint.updateUserTaskIntermediateVariablesState(
    { host: machine.host || machine.ip, port: machine.port },
    instanceId,
    userTaskId,
    variable
  );
}

/**
 * Starts an instance of the deployed process with the given id
 *
 * @param {String} processDefinitionsId id of the deployed process
 * @param {Number} version the version of the process to start
 * @throws Will throw an error if starting the instance fails
 */
export async function startInstance(processDefinitionsId, version) {
  immediateDeploymentInfoRequest();

  const deployment = getDeployments()[processDefinitionsId];

  if (deployment) {
    const deploymentVersion = deployment.versions.find(
      (versionInfo) => versionInfo.version == version
    );

    if (deploymentVersion) {
      let startMachineInfo;
      const bpmnObj = await toBpmnObject(deploymentVersion.bpmn);
      if (deploymentVersion.deploymentMethod === 'static') {
        const machineMapping = await getElementMachineMapping(bpmnObj);
        const [startEventId] = await getStartEvents(bpmnObj);

        startMachineInfo = machineMapping[startEventId];
      } else {
        startMachineInfo = { machineId: deploymentVersion.machines[0].machineId };
      }
      let startMachine;
      if (startMachineInfo.machineId) {
        startMachine = deployment.machines.find((m) => m.id === startMachineInfo.machineId);
      } else {
        const [ip, port] = startMachineInfo.machineAddress
          .replace(/\[?((?:(?:\d|\w)|:|\.)*)\]?:(\d*)/g, '$1+$2')
          .split('+');
        startMachine = { ip, port };
      }

      // if a 5thIndustry Plan is linked to the Process => make sure it is set to being in progress when the instance is started
      let started5thIndustryPlan = false;
      const [process] = getElementsByTagName(bpmnObj, 'bpmn:Process');
      const metaData = getMetaDataFromElement(process);
      try {
        if (metaData['_5i-Inspection-Plan-ID']) {
          await start5thIndustryPlan(metaData['_5i-Inspection-Plan-ID']);
          started5thIndustryPlan = true;

          const serviceAccountData = get5thIndustryServiceAccountData();

          // give the engine a way to authenticate itself in the 5thIndustry Application
          if (serviceAccountData) {
            // Pass the currently used service account data
            await _5thIndustryEndpoint.send5thIndustryServiceAccountData(
              startMachine,
              serviceAccountData
            );
          } else {
            // Pass the currently used authorization token
            // Warning: when this token becomes invalid the engine won't be able to communicate with the 5thIndustry Application
            await _5thIndustryEndpoint.send5thIndustryAuthorization(
              startMachine,
              get5thIndustryAuthorization()
            );
          }
        }

        const instanceId = await processEndpoint.startProcessInstance(
          startMachine,
          processDefinitionsId,
          version,
          {}
        );

        await immediateDeploymentInfoRequest();

        return instanceId;
      } catch (e) {
        if (logger) {
          logger.debug(`EXECUTION Error starting the process instance: ${e}`);
          throw e;
        }
        // make sure to rollback in 5thIndustry App if there was a plan set to in progress but starting the instance failed
        if (started5thIndustryPlan) {
          await stop5thIndustryPlan(metaData['_5i-Inspection-Plan-ID']);
        }
      }
    }
  }

  throw new Error(
    `Error starting the process instance: Could not find a machine the process (id: ${processDefinitionsId}) version (id: ${version}) is deployed to.`
  );
}

/**
 * Sends request to stop an instance of a process on a machine
 */
export async function stopInstance(processDefinitionsId, instanceId) {
  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);

  const deployment = getDeployments()[processDefinitionsId];

  if (deployment) {
    const activelyExecutingMachines = deployment.runningInstances[instanceId];

    if (activelyExecutingMachines && activelyExecutingMachines.length) {
      const instance = deployment.instances[instanceId];

      const deploymentBpmn = deployment.versions.find(
        ({ version }) => version == instance.processVersion
      ).bpmn;

      const bpmnObj = await toBpmnObject(deploymentBpmn);
      const [process] = getElementsByTagName(bpmnObj, 'bpmn:Process');
      const metaData = getMetaDataFromElement(process);

      if (metaData['_5i-Inspection-Plan-ID']) {
        await stop5thIndustryPlan(metaData['_5i-Inspection-Plan-ID']);
      }

      activelyExecutingMachines.forEach((machineId) => {
        const machine = deployment.machines.find((m) => m.id === machineId);

        if (!machine) {
          if (logger) {
            logger.error('Unable to stop instance: Machine not found.');
          }
          throw new Error('Unable to stop instance: Machine not found.');
        }

        try {
          processEndpoint.stopProcessInstance(machine, processDefinitionsId, instanceId);
        } catch (err) {
          if (logger) {
            logger.error(`Failed to stop instance on ${machine.name}: ${err}.`);
            throw err;
          }
        }
      });
    }
  }

  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);
}

/**
 * Sends request to pause an instance of a process on a machine
 */
export async function pauseInstance(processDefinitionsId, instanceId) {
  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);

  const deployment = getDeployments()[processDefinitionsId];

  if (deployment) {
    const activelyExecutingMachines = deployment.runningInstances[instanceId];
    const instance = getInstances()[instanceId];

    if (
      instance &&
      instance.instanceState[0] !== 'PAUSED' &&
      activelyExecutingMachines &&
      activelyExecutingMachines.length
    ) {
      activelyExecutingMachines.forEach((machineId) => {
        const machine = deployment.machines.find((m) => m.id === machineId);

        if (!machine) {
          if (logger) {
            logger.error('Unable to pause instance: Machine not found.');
          }
          throw new Error('Unable to pause instance: Machine not found.');
        }

        try {
          processEndpoint.pauseProcessInstance(machine, processDefinitionsId, instanceId);
        } catch (err) {
          if (logger) {
            logger.error(`Failed to pause instance on ${machine.name}: ${err}.`);
            throw err;
          }
        }
      });
    }
  }

  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);
}

/**
 * Sends request to resume an instance of a process on a machine
 */
export async function resumeInstance(processDefinitionsId, instanceId) {
  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);

  const deployment = getDeployments()[processDefinitionsId];

  if (deployment) {
    const activelyExecutingMachines = deployment.runningInstances[instanceId];
    const instance = getInstances()[instanceId];

    if (
      activelyExecutingMachines &&
      activelyExecutingMachines.length &&
      instance &&
      (instance.instanceState[0] === 'PAUSED' || instance.instanceState[0] === 'PAUSING')
    ) {
      activelyExecutingMachines.forEach((machineId) => {
        const machine = deployment.machines.find((m) => m.id === machineId);

        if (!machine) {
          if (logger) {
            logger.error('Unable to resume instance: Machine not found.');
          }
          throw new Error('Unable to resume instance: Machine not found.');
        }

        try {
          processEndpoint.resumeProcessInstance(machine, processDefinitionsId, instanceId);
        } catch (err) {
          if (logger) {
            logger.error(`Failed to resume instance on ${machine.name}: ${err}.`);
            throw err;
          }
        }
      });
    }
  }

  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);
}

/**
 * Updated token inside an instance with given attributes
 *
 * @param {Object} machine
 * @param {String} machine.ip the ip address of the machine
 * @param {Number} machine.port the port of the machine
 * @param {String} processDefinitionsId
 * @param {String} instanceId
 * @param {String} tokenId
 * @param {String} attributes
 */
export async function updateToken(processDefinitionsId, instanceId, tokenId, attributes) {
  // make sure that the newest instance information is present before working with it
  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);

  const deployment = getDeployments()[processDefinitionsId];

  // get the correct machine for the referenced token from the deployment and instance information
  const instance = getInstances()[instanceId];
  const token = instance.tokens.find((t) => t.tokenId === tokenId);
  const tokenMachine = deployment.machines.find((machine) => machine.id === token.machineId);

  await processEndpoint.updateToken(
    tokenMachine,
    processDefinitionsId,
    instanceId,
    tokenId,
    attributes
  );

  // instantly request instance information so the requesting user sees the result immediately
  await immediateInstanceInfoRequest(instanceId);
}

/**
 * Changes the state of the tokens inside a process instance
 *
 * @param {String} processDefinitionsId the id of the process we want to change an instance of
 * @param {String} instanceId the id of the instance we want to change
 * @param {Object} tokenChanges The changes to apply to the token state of the instance
 * @param {Object} tokenChanges.addedTokens the tokens the user wants to add to the instance
 * @param {Object} tokenChanges.movedTokens the tokens the user wants to move to another point in the instance
 * @param {Object} tokenChanges.removedTokens the tokens the user marked for removal
 */
export async function updateInstanceTokenState(processDefinitionsId, instanceId, tokenChanges) {
  await immediateDeploymentInfoRequest();

  const deployment = getDeployments()[processDefinitionsId];

  function getTokenMachine(token) {
    return deployment.machines.find((m) => m.id === token.machineId);
  }

  // add new tokens to the instance
  await asyncForEach(Object.values(tokenChanges.addedTokens), async (token) => {
    let machineId;

    if (deployment.runningInstances[instanceId]) {
      machineId = deployment.runningInstances[instanceId][0];
    } else {
      machineId = deployment.instances[instanceId].machines[0];
    }

    const machine = deployment.machines.find((m) => m.id === machineId);

    await processEndpoint.addToken(machine, processDefinitionsId, instanceId, {
      ...token,
      machine: undefined,
    });
  });
  // wait for changes to take effect
  await new Promise((resolve) => setTimeout(resolve, 10));

  // move tokens
  await asyncForEach(Object.values(tokenChanges.movedTokens), async (token) => {
    await processEndpoint.moveToken(
      getTokenMachine(token),
      processDefinitionsId,
      instanceId,
      token.tokenId,
      token.currentFlowElementId
    );
  });

  // wait for changes to take effect
  await new Promise((resolve) => setTimeout(resolve, 10));

  // remove tokens
  await asyncForEach(Object.values(tokenChanges.removedTokens), async (token) => {
    await processEndpoint.removeToken(
      getTokenMachine(token),
      processDefinitionsId,
      instanceId,
      token.tokenId
    );
  });

  await immediateDeploymentInfoRequest();
  await immediateInstanceInfoRequest(instanceId);
}

/**
 * Will try to migrate the requested instances from their current version to the target version
 *
 * @param {String} definitionId the id of the process the instances are running in
 * @param {Number} currentVersion the version of the process the instances are running in
 * @param {Number} targetVersion the version the instances are supposed to be migrated to
 * @param {String[]} instanceIds the instances to migrate
 * @param {{ tokenMapping, flowElementMapping }} migrationArgs mappings that define how the tokens inside the instance should be adapted on migration
 */
export async function migrateInstances(
  definitionId,
  currentVersion,
  targetVersion,
  instanceIds,
  migrationArgs
) {
  if (migrationArgs.tokenMapping && instanceIds.length > 1) {
    throw new Error('A tokenMapping is only usable when a single instance is migrated');
  }

  // get the up to date deployment information
  await immediateDeploymentInfoRequest();
  await asyncForEach(instanceIds, async (instanceId) => {
    await immediateInstanceInfoRequest(instanceId);
  });

  const deployment = getDeployments()[definitionId];

  await asyncForEach(instanceIds, async (instanceId) => {
    const instance = getInstances()[instanceId];

    const machines = deployment.machines.filter((machine) =>
      deployment.instances[instanceId].machines.includes(machine.id)
    );

    // make sure the target version is actually deployed on the machines (the version might not be locally available)
    await asyncForEach(machines, async (machine) => {
      const targetVersionDeployment = deployment.versions.find(
        ({ version }) => version == targetVersion
      );

      if (
        !targetVersionDeployment ||
        !targetVersionDeployment.machines.some(({ machineId }) => machineId === machineId)
      ) {
        // deploy the version if it is not already deployed to the machine
        const bpmn = await getProcessVersionBpmn(definitionId, targetVersion);
        await dynamicDeployment(definitionId, targetVersion, bpmn, machine);
      }
    });

    let firstToMigrate = true;

    // send the filtered migrationInformation to the machines
    await asyncForEach(machines, async (machine) => {
      let machineMigrationArgs = JSON.parse(JSON.stringify(migrationArgs));

      // Create a machine specific token mapping when a general token mapping is provided with the migration
      if (machineMigrationArgs.tokenMapping) {
        // make a copy of the tokenMapping
        const machineTokenMapping = machineMigrationArgs.tokenMapping;

        const machineTokens = instance.tokens.filter((token) => token.machineId === machine.id);

        // ignore forwarded tokens for a token move (they are active on another machine)
        if (machineTokenMapping.move) {
          machineTokenMapping.move = machineTokenMapping.move.filter((tokenMove) =>
            machineTokens.some((machineToken) => machineToken.tokenId === tokenMove.tokenId)
          );
        }

        // only try to remove tokens that are on the machine
        if (machineTokenMapping.remove) {
          machineTokenMapping.remove = machineTokenMapping.remove.filter((tokenId) =>
            machineTokens.some((token) => token.tokenId === tokenId)
          );
        }

        // prevent tokens from being added on multiple machines
        if (!firstToMigrate) {
          machineTokenMapping.add = undefined;
        }

        firstToMigrate = false;
      }

      await processEndpoint.migrateInstances(
        machine,
        definitionId,
        currentVersion,
        targetVersion,
        [instanceId],
        machineMigrationArgs
      );
    });
  });

  // get the up to date deployment information
  await immediateDeploymentInfoRequest();
  await asyncForEach(instanceIds, async (instanceId) => {
    await immediateInstanceInfoRequest(instanceId);
  });
}
