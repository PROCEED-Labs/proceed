import logger from '../shared-electron-server/logging.js';

import {
  getDeployments,
  getActiveUserTasks,
  getInstances,
} from '../shared-electron-server/data/deployment.js';

import {
  pollDeploymentInfoFromKnownMachines,
  stopPollingDeploymentInfo,
  pollActiveUserTasksFromKnownMachines,
  stopPollingActiveUserTasks,
  pollInstanceInfoFromKnownMachines,
  stopPollingInstanceInfo,
} from '../shared-electron-server/network/process/polling.js';

import eventHandler from '../../frontend/backend-api/event-system/EventHandler.js';

export function setupDeploymentInfoRequestHandlers(io) {
  // TODO: check that socket has authorization
  const deploymentNamespace = io.of(/^\/deployment$/);

  deploymentNamespace.on('connection', async (socket) => {
    logger.debug(`Client registered for updates of deployment information.`);

    // send the current deployment information to the requesting client
    const deployments = { ...getDeployments() };
    Object.entries(deployments).forEach(([deploymentId, deployment]) => {
      deployments[deploymentId] = {
        ...deployment,
        machines: deployment.machines.map((machine) => machine.id),
      };
    });
    socket.emit('deployments', deployments);

    // start the polling for the deployments when the first client registers
    if ((await socket.nsp.allSockets()).size === 1) {
      pollDeploymentInfoFromKnownMachines();
    }

    socket.on('disconnect', async () => {
      logger.debug(`Client unregistered from updates for deployment information`);
      // stop polling of deployments when the last client unsubscribes
      if (!(await socket.nsp.allSockets()).size) {
        stopPollingDeploymentInfo();
      }
    });
  });

  // forward deployment changes to the clients that are subscribed to the namespace
  eventHandler.on('deployment_changed', ({ processDefinitionsId, info }) => {
    deploymentNamespace.emit('deployment.changed', {
      processDefinitionsId,
      info: { ...info, machines: info.machines.map((machine) => machine.id) },
    });
  });

  // forward a deployment being removed to clients subscribed to the namespace
  eventHandler.on('deployment_removed', (processDefinitionsId) => {
    deploymentNamespace.emit('deployment_removed', processDefinitionsId);
  });

  // TODO: check that socket has authorization
  const activeUserTaskNamespace = io.of(/^\/user-tasks$/);

  activeUserTaskNamespace.on('connection', async (socket) => {
    logger.debug(`Client registered for updates of active user tasks.`);

    // send the current active user tasks to the requesting client
    const activeUserTasks = getActiveUserTasks();
    socket.emit('activeUserTasks', activeUserTasks);

    // start the polling for active user tasks when the first client registers
    if ((await socket.nsp.allSockets()).size === 1) {
      pollActiveUserTasksFromKnownMachines();
    }

    socket.on('disconnect', async () => {
      logger.debug(`Client unregistered from updates for active user tasks`);
      // stop polling of active user tasks when the last client unsubscribes
      if (!(await socket.nsp.allSockets()).size) {
        stopPollingActiveUserTasks();
      }
    });
  });

  // forward changes of active user task to the clients that are subscribed to the namespace
  eventHandler.on('activeUserTasks_changed', (updateActiveUserTasks) => {
    activeUserTaskNamespace.emit('activeUserTasks.changed', updateActiveUserTasks);
  });

  // forward an active user task being removed to clients subscribed to the namespace
  eventHandler.on('activeUserTask_removed', ({ instanceID, userTaskID }) => {
    activeUserTaskNamespace.emit('activeUserTask_removed', { instanceID, userTaskID });
  });

  // creating a namespace for each instance a client wants to subscribe to (clients subscribed to the same instance share the namespace)
  // TODO: check that socket has authorization
  const instanceNamespace = io.of(/^\/deployment\/(\w|-)*\/instances\/(\w|-)*$/);

  instanceNamespace.on('connection', async (socket) => {
    // get the information about the instance from the name of the namespace
    const namespaceName = socket.nsp.name;
    const [_1, processDefinitionsId, _2, instanceId] = namespaceName.slice(1).split('/');

    logger.debug(
      `Client registered for updates to the information of an instance (processDefinitionsId: ${processDefinitionsId}; instanceId: ${instanceId}).`,
    );

    // send the current information known about the instance to the subscribing client
    if (getInstances()[instanceId]) {
      socket.emit('instance', { instanceId, info: getInstances()[instanceId] });
    }

    // start polling the instance information when the first client subscribes to the specific instance
    if ((await socket.nsp.allSockets()).size === 1) {
      await pollInstanceInfoFromKnownMachines(processDefinitionsId, instanceId);
    }

    socket.on('disconnect', async () => {
      logger.debug(
        `Client unregistered from updates to the information of an instance (processDefinitionsId: ${processDefinitionsId}; instanceId: ${instanceId}).`,
      );

      // stop polling the information about the specific instance when the last client unsubscribes
      if (!(await socket.nsp.allSockets()).size) {
        await stopPollingInstanceInfo(instanceId);
      }
    });
  });

  // forward instance changes to the clients subscribed to the specific instance
  eventHandler.on('instance_changed', ({ instanceId, info }) => {
    if (info) {
      io.of(`/deployment/${info.processId}/instances/${instanceId}`).emit('instance.changed', {
        instanceId,
        info,
      });
    }
  });
  // forward an instance being removed to the clients subscribed to the specific instance
  eventHandler.on('instance_removed', ({ definitionId, instanceId }) => {
    io.of(`/deployment/${definitionId}/instances/${instanceId}`).emit(
      'instance.removed',
      instanceId,
    );
  });
}
