import { listen, request, io, connectionId } from './socket.js';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';

let deploymentSubscription = null;

async function subscribeForDeploymentUpdates() {
  if (!deploymentSubscription) {
    deploymentSubscription = io(`https://${window.location.hostname}:33081/deployment`);

    deploymentSubscription.on('deployments', (deployments) => {
      eventHandler.dispatch('deployments_current', deployments);
    });

    deploymentSubscription.on('deployment.changed', ({ processDefinitionsId, info }) => {
      eventHandler.dispatch('deployment_changed', { processDefinitionsId, info });
    });

    deploymentSubscription.on('deployment_removed', (processDefinitionsId) => {
      eventHandler.dispatch('deployment_removed', processDefinitionsId);
    });

    const connectionPromise = new Promise((resolve, reject) => {
      deploymentSubscription.on('connect', () => resolve);

      deploymentSubscription.on('connect_error', (err) => {
        reject(`Failed connection to deployment socket: ${err.message}`);
      });
    });

    await connectionPromise;
  }
}

async function unsubscribeFromDeploymentUpdates() {
  if (deploymentSubscription) {
    deploymentSubscription.disconnect();
    deploymentSubscription = null;
  }
}

let activeUserTaskSubscription = null;

async function subscribeForActiveUserTaskUpdates() {
  if (!activeUserTaskSubscription) {
    activeUserTaskSubscription = io(`https://${window.location.hostname}:33081/user-tasks`);

    activeUserTaskSubscription.on('activeUserTasks', (activeUserTasks) => {
      eventHandler.dispatch('activeUserTasks_current', activeUserTasks);
    });

    activeUserTaskSubscription.on('activeUserTasks.changed', (updateActiveUserTasks) => {
      eventHandler.dispatch('activeUserTasks_changed', updateActiveUserTasks);
    });

    activeUserTaskSubscription.on('activeUserTask_removed', ({ instanceID, userTaskID }) => {
      eventHandler.dispatch('activeUserTask_removed', { instanceID, userTaskID });
    });

    const connectionPromise = new Promise((resolve, reject) => {
      activeUserTaskSubscription.on('connect', () => resolve);

      activeUserTaskSubscription.on('connect_error', (err) => {
        reject(`Failed connection to user-tasks socket: ${err.message}`);
      });
    });

    await connectionPromise;
  }
}

async function unsubscribeFromActiveUserTaskUpdates() {
  if (activeUserTaskSubscription) {
    activeUserTaskSubscription.disconnect();
    activeUserTaskSubscription = null;
  }
}

const instanceSubscriptions = {};

async function subscribeForInstanceUpdates(definitionId, instanceId) {
  if (!instanceSubscriptions[instanceId]) {
    instanceSubscriptions[instanceId] = io(
      `https://${window.location.hostname}:33081/deployment/${definitionId}/instances/${instanceId}`,
    );

    instanceSubscriptions[instanceId].on('instance', ({ instanceId, info }) => {
      eventHandler.dispatch('instance_current', { instanceId, info });
    });

    instanceSubscriptions[instanceId].on('instance.changed', ({ instanceId, info }) => {
      eventHandler.dispatch('instance_changed', { instanceId, info });
    });

    instanceSubscriptions[instanceId].on('instance.removed', (instanceId) => {
      eventHandler.dispatch('instance_removed', instanceId);
    });

    const connectionPromise = new Promise((resolve, reject) => {
      instanceSubscriptions[instanceId].on('connect', () => resolve);

      instanceSubscriptions[instanceId].on('connect_error', (err) => {
        reject(`Failed connection to instance (id: ${instanceId}) socket: ${err.message}`);
      });
    });

    await connectionPromise;
  }
}

async function unsubscribeFromInstanceUpdates(instanceId) {
  if (instanceSubscriptions[instanceId]) {
    instanceSubscriptions[instanceId].disconnect();
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
