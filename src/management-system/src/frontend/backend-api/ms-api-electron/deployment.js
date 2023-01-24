import {
  pollDeploymentInfoFromKnownMachines,
  stopPollingDeploymentInfo,
  pollActiveUserTasksFromKnownMachines,
  stopPollingActiveUserTasks,
  pollInstanceInfoFromKnownMachines,
  stopPollingInstanceInfo,
} from '@/backend/shared-electron-server/network/process/polling.js';

import {
  getDeployments,
  getActiveUserTasks,
  getInstances,
} from '@/backend/shared-electron-server/data/deployment.js';

import eventHandler from '../event-system/EventHandler.js';

let isSubscribedForDeploymentUpdates = false;

async function subscribeForDeploymentUpdates() {
  if (!isSubscribedForDeploymentUpdates) {
    const deployments = JSON.parse(JSON.stringify(getDeployments()));

    Object.entries(deployments).forEach(([deploymentId, deployment]) => {
      deployments[deploymentId] = {
        ...deployment,
        machines: deployment.machines.map((machine) => machine.id),
      };
    });

    eventHandler.dispatch('deployments_current', deployments);
    pollDeploymentInfoFromKnownMachines();
    isSubscribedForDeploymentUpdates = true;
  }
}

async function unsubscribeFromDeploymentUpdates() {
  if (isSubscribedForDeploymentUpdates) {
    stopPollingDeploymentInfo();
    isSubscribedForDeploymentUpdates = false;
  }
}

let isSubscribedForActiveUserTaskUpdates = false;

async function subscribeForActiveUserTaskUpdates() {
  if (!isSubscribedForActiveUserTaskUpdates) {
    const activeUserTasks = JSON.parse(JSON.stringify(getActiveUserTasks()));

    eventHandler.dispatch('activeUserTasks_current', activeUserTasks);
    pollActiveUserTasksFromKnownMachines();
    isSubscribedForActiveUserTaskUpdates = true;
  }
}

async function unsubscribeFromActiveUserTaskUpdates() {
  if (isSubscribedForActiveUserTaskUpdates) {
    stopPollingActiveUserTasks();
    isSubscribedForActiveUserTaskUpdates = false;
  }
}

const instanceSubscriptions = {};

async function subscribeForInstanceUpdates(definitionId, instanceId) {
  if (!instanceSubscriptions[instanceId]) {
    eventHandler.dispatch('instance_current', { instanceId, info: getInstances()[instanceId] });
    await pollInstanceInfoFromKnownMachines(definitionId, instanceId);

    instanceSubscriptions[instanceId] = true;
  }
}

async function unsubscribeFromInstanceUpdates(instanceId) {
  if (instanceSubscriptions[instanceId]) {
    stopPollingInstanceInfo(instanceId);
    delete instanceSubscriptions[instanceId];
  }
}

export default {
  subscribeForDeploymentUpdates,
  unsubscribeFromDeploymentUpdates,
  subscribeForActiveUserTaskUpdates,
  unsubscribeFromActiveUserTaskUpdates,
  subscribeForInstanceUpdates,
  unsubscribeFromInstanceUpdates,
};
