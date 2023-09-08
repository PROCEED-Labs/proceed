import store from './store.js';
import { processMetaObjects } from './process.js';

import eventHandler from '../../../frontend/backend-api/event-system/EventHandler.js';

import { deepEquals } from '../../../shared-frontend-backend/helpers/javascriptHelpers.js';
import logger from '../logging.js';

const deployments = store.get('deployments');

export function getDeployments() {
  return deployments;
}

/**
 * Stores/Overwrites the current information of a specific deployment
 *
 * @param {string} processDefinitionsId
 * @param {object} deploymentInformation
 */
export function updateDeployment(processDefinitionsId, deploymentInformation) {
  // don't do anything if nothing changed
  if (
    !deployments[processDefinitionsId] ||
    !deepEquals(deployments[processDefinitionsId], deploymentInformation)
  ) {
    deployments[processDefinitionsId] = deploymentInformation;

    // save the deployment data persistently if it is a deployment of a locally known project
    if (
      deploymentInformation &&
      processMetaObjects[processDefinitionsId] &&
      processMetaObjects[processDefinitionsId].type === 'project'
    ) {
      store.set('deployments', processDefinitionsId, { ...deploymentInformation, machines: [] });
    }

    // emit an event so other components can react to the deployment change (used mostly to send information to the frontend)
    eventHandler.dispatch('deployment_changed', {
      processDefinitionsId,
      info: deploymentInformation,
    });
  }
}

// if a project is being removed make sure to remove unnecessary deployment information that might still be stored (only project deployments are written to the persistent store)
eventHandler.on('processRemoved', ({ processDefinitionsId }) => {
  if (store.get('deployments')[processDefinitionsId]) {
    logger.debug(
      `Removing deployment information for project (id: ${processDefinitionsId}) since it is being removed.`,
    );
    removeDeployment(processDefinitionsId);
  }
});

/**
 * Removes a deployment from being stored
 *
 * @param {string} processDefinitionsId
 */
export function removeDeployment(processDefinitionsId) {
  if (deployments[processDefinitionsId]) {
    // remove all associated instances
    if (deployments[processDefinitionsId].instances) {
      Object.keys(deployments[processDefinitionsId].instances).forEach((instanceId) => {
        removeInstance(instanceId);
      });
    }

    // make sure to remove the deployment for persistent storage if it is stored there (only projects are stored persistently)
    store.set('deployments', processDefinitionsId, undefined);

    delete deployments[processDefinitionsId];
    eventHandler.dispatch('deployment_removed', processDefinitionsId);
  }
}

let activeUserTasks = [];

export function getActiveUserTasks() {
  return activeUserTasks;
}

/**
 * Stores/Overwrites the current active User Tasks
 *
 * @param {Array} activeUserTasks
 */
export function updateActiveUserTasks(updatedActiveUserTasks) {
  if (!deepEquals(updatedActiveUserTasks, activeUserTasks)) {
    activeUserTasks = updatedActiveUserTasks;
    // emit an event so other components can react to the active user tasks change (used mostly to send information to the frontend)
    eventHandler.dispatch('activeUserTasks_changed', updatedActiveUserTasks);
  }
}

/**
 * Removes a deployment from being stored
 *
 * @param {string} processDefinitionsId
 */
export function removeActiveUserTask(instanceID, userTaskID) {
  const activeUserTaskFound = !!activeUserTasks.find(
    (activeUserTask) =>
      activeUserTask.instanceID === instanceID && activeUserTask.id === userTaskID,
  );
  if (activeUserTaskFound) {
    activeUserTasks = activeUserTasks.filter(
      (activeUserTask) =>
        activeUserTask.instanceID !== instanceID || activeUserTask.id !== userTaskID,
    );
    eventHandler.dispatch('activeUserTask_removed', activeUserTaskFound);
  }
}

const instances = store.get('instances');

export function getInstances() {
  return instances;
}

/**
 * Stores/Overwrites the current information of a specific instance
 *
 * @param {string} instanceId
 * @param {object} instanceInformation
 */
export function updateInstance(instanceId, instanceInformation) {
  // don't do anything if nothing changed
  if (!instances[instanceId] || !deepEquals(instances[instanceId], instanceInformation)) {
    instances[instanceId] = instanceInformation;

    // save the instance data persistently if it is an instance of a locally known project
    if (
      instanceInformation &&
      processMetaObjects[instanceInformation.processId] &&
      processMetaObjects[instanceInformation.processId].type === 'project'
    ) {
      store.set('instances', instanceId, instanceInformation);
    }

    // emit an event so other components can react to the instance change (used mostly to send information to the frontend)
    eventHandler.dispatch('instance_changed', {
      instanceId,
      info: instanceInformation,
    });
  }
}

/**
 * Remove the information about a specific instance
 *
 * @param {string} instanceId
 */
export function removeInstance(instanceId) {
  if (instances[instanceId]) {
    eventHandler.dispatch('instance_removed', {
      definitionId: instances[instanceId].processId,
      instanceId,
    });

    // make sure to remove persistently stored instance data (instance data is only stored for projects)
    store.set('instances', instanceId, undefined);

    delete instances[instanceId];
  }
}
