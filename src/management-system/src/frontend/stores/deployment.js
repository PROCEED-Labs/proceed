import {
  deploymentInterface,
  engineNetworkInterface,
  eventHandler,
} from '@/frontend/backend-api/index.js';

export default function createDeploymentStore() {
  const initialState = {
    deployments: {},
    instances: {},
    activeUserTasks: [],
  };

  const getters = {
    deployments: (state) => state.deployments,
    instances: (state) => state.instances,
    activeUserTasks: (state) => state.activeUserTasks,
  };

  // these counters are used to handle situations where two components might subscribe for deployment info
  // if one unsubscribes the subscription to the backend should not be stopped since the other still needs the information
  let deploymentSubscriptionCount = 0;
  let activeUserTaskSubscriptionCount = 0;
  const instanceSubscriptionCounts = {};

  const actions = {
    init({ commit }) {
      eventHandler.on('deployments_current', (deployments) => {
        commit('setDeployments', deployments);
      });
      eventHandler.on('deployment_changed', ({ processDefinitionsId, info }) => {
        commit('updateDeployment', { processDefinitionsId, info });
      });
      1;
      eventHandler.on('deployment_removed', (processDefinitionsId) => {
        commit('removeDeployment', processDefinitionsId);
      });
      eventHandler.on('activeUserTasks_current', (activeUserTasks) => {
        commit('setActiveUserTasks', activeUserTasks);
      });
      eventHandler.on('activeUserTasks_changed', (updatedActiveUserTasks) => {
        commit('updateActiveUserTasks', updatedActiveUserTasks);
      });
      1;
      eventHandler.on('activeUserTask_removed', ({ instanceID, userTaskID }) => {
        commit('removeActiveUserTask', { instanceID, userTaskID });
      });
      eventHandler.on('instance_current', ({ instanceId, info }) => {
        commit('updateInstance', { instanceId, info });
      });
      eventHandler.on('instance_changed', ({ instanceId, info }) => {
        commit('updateInstance', { instanceId, info });
      });
      eventHandler.on('instance_removed', (instanceId) => {
        commit('removeInstance', instanceId);
      });
    },

    subscribeForDeploymentUpdates() {
      if (!deploymentSubscriptionCount) {
        engineNetworkInterface.startMachinePolling();
        deploymentInterface.subscribeForDeploymentUpdates();
      }
      ++deploymentSubscriptionCount;
    },

    unsubscribeFromDeploymentUpdates() {
      deploymentSubscriptionCount = !deploymentSubscriptionCount
        ? 0
        : deploymentSubscriptionCount - 1;

      if (!deploymentSubscriptionCount) {
        engineNetworkInterface.stopMachinePolling();
        deploymentInterface.unsubscribeFromDeploymentUpdates();
      }
    },

    subscribeForActiveUserTaskUpdates() {
      if (!activeUserTaskSubscriptionCount) {
        engineNetworkInterface.startMachinePolling();
        deploymentInterface.subscribeForActiveUserTaskUpdates();
      }
      ++activeUserTaskSubscriptionCount;
    },

    unsubscribeFromActiveUserTaskUpdates() {
      activeUserTaskSubscriptionCount = !activeUserTaskSubscriptionCount
        ? 0
        : activeUserTaskSubscriptionCount - 1;

      if (!activeUserTaskSubscriptionCount) {
        engineNetworkInterface.stopMachinePolling();
        deploymentInterface.unsubscribeFromActiveUserTaskUpdates();
      }
    },

    subscribeForInstanceUpdates(_, { definitionId, instanceId }) {
      if (!instanceSubscriptionCounts[instanceId]) {
        deploymentInterface.subscribeForInstanceUpdates(definitionId, instanceId);
        instanceSubscriptionCounts[instanceId] = 0;
      }
      ++instanceSubscriptionCounts[instanceId];
    },

    unsubscribeFromInstanceUpdates(_, instanceId) {
      instanceSubscriptionCounts[instanceId] = !instanceSubscriptionCounts[instanceId]
        ? 0
        : instanceSubscriptionCounts[instanceId] - 1;

      if (!instanceSubscriptionCounts[instanceId]) {
        deploymentInterface.unsubscribeFromInstanceUpdates(instanceId);
        delete instanceSubscriptionCounts[instanceId];
      }
    },
  };

  const mutations = {
    setDeployments(state, deployments) {
      state.deployments = deployments;
    },

    updateDeployment(state, { processDefinitionsId, info }) {
      state.deployments = { ...state.deployments, [processDefinitionsId]: info };
    },

    removeDeployment(state, processDefinitionsId) {
      state.deployments = { ...state.deployments, [processDefinitionsId]: null };
      delete state.deployments[processDefinitionsId];
    },

    setActiveUserTasks(state, activeUserTasks) {
      state.activeUserTasks = activeUserTasks;
    },

    updateActiveUserTasks(state, updatedActiveUserTasks) {
      state.activeUserTasks = updatedActiveUserTasks;
    },

    removeActiveUserTask(state, { instanceID, userTaskID }) {
      state.activeUserTasks = state.activeUserTasks.filter(
        (userTask) => userTask.instanceID === instanceID && userTask.id === userTaskID
      );
    },

    updateInstance(state, { instanceId, info }) {
      state.instances = { ...state.instances, [instanceId]: info };
    },

    removeInstance(state, instanceId) {
      state.instances = { ...state.instances, [instanceId]: null };
      delete state.instances[instanceId];
    },
  };

  return {
    namespaced: true,
    state: initialState,
    getters,
    mutations,
    actions,
  };
}
