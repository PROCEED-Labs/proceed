import api from './ms-api-interface/deployment.js';

export default class DeploymentInterface {
  /**
   * @hideconstructor
   */
  constructor() {}

  async subscribeForDeploymentUpdates() {
    await api.subscribeForDeploymentUpdates();
  }

  async unsubscribeFromDeploymentUpdates() {
    await api.unsubscribeFromDeploymentUpdates();
  }

  async subscribeForActiveUserTaskUpdates() {
    await api.subscribeForActiveUserTaskUpdates();
  }

  async unsubscribeFromActiveUserTaskUpdates() {
    await api.unsubscribeFromActiveUserTaskUpdates();
  }

  async subscribeForInstanceUpdates(definitionId, instanceId) {
    await api.subscribeForInstanceUpdates(definitionId, instanceId);
  }

  async unsubscribeFromInstanceUpdates(instanceId) {
    await api.unsubscribeFromInstanceUpdates(instanceId);
  }
}
