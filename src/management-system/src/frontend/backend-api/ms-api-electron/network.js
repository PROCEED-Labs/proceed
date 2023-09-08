import * as backendDeployment from '@/backend/shared-electron-server/network/process/deployment.js';
import * as backendInstanceHandling from '@/backend/shared-electron-server/network/process/instance.js';
import * as backendRequests from '@/backend/shared-electron-server/network/requests.js';
import * as backendMachineInfo from '@/backend/shared-electron-server/network/machines/machineInfo.js';

async function removeDeployment(processDefinitionsId) {
  await backendDeployment.removeDeployment(processDefinitionsId);
}

async function startInstance(processDefinitionsId, version) {
  return await backendInstanceHandling.startInstance(processDefinitionsId, version);
}

async function stopInstance(processDefinitionsId, instanceId) {
  await backendInstanceHandling.stopInstance(processDefinitionsId, instanceId);
}

async function pauseInstance(processDefinitionsId, instanceId) {
  await backendInstanceHandling.pauseInstance(processDefinitionsId, instanceId);
}

async function resumeInstance(processDefinitionsId, instanceId) {
  await backendInstanceHandling.resumeInstance(processDefinitionsId, instanceId);
}

async function deployProcessVersion(processDefinitionsId, version, dynamic) {
  await backendDeployment.deployProcessVersion(processDefinitionsId, version, dynamic);
}

async function updateToken(processDefinitionsId, instanceId, tokenId, attributes) {
  await backendInstanceHandling.updateToken(processDefinitionsId, instanceId, tokenId, attributes);
}

async function getStatus(machineId) {
  const running = backendRequests.getStatus(machineId);

  return running;
}

async function completeUserTask(instanceId, userTaskId) {
  await backendInstanceHandling.completeUserTask(instanceId, userTaskId);
}

async function updateUserTaskMilestone(instanceId, userTaskId, milestone) {
  await backendInstanceHandling.updateUserTaskMilestone(instanceId, userTaskId, milestone);
}

async function updateUserTaskIntermediateVariablesState(instanceId, userTaskId, variable) {
  await backendInstanceHandling.updateUserTaskIntermediateVariablesState(
    instanceId,
    userTaskId,
    variable,
  );
}

async function getMachineProperties(machineId, properties) {
  const machineProperties = await backendRequests.getMachineProperties(machineId, properties);

  return machineProperties;
}

async function sendConfiguration(machineId, configuration) {
  await backendRequests.sendConfiguration(machineId, configuration);
}

async function getConfiguration(machineId) {
  const configuration = await backendRequests.getConfiguration(machineId);

  return configuration;
}

async function getLogs(machineId) {
  const logs = await backendRequests.getLogs(machineId);

  return logs;
}

async function startMachinePolling() {
  backendMachineInfo.startPolling();
}

async function stopMachinePolling() {
  backendMachineInfo.stopPolling();
}

async function subscribeToMachine(machineId) {
  backendMachineInfo.addMachineSubscription(machineId);
}

async function unsubscribeFromMachine(machineId) {
  backendMachineInfo.removeMachineSubscription(machineId);
}

async function subscribeToMachineLogs(machineId) {
  backendMachineInfo.addMachineLogsSubscription(machineId);
}

async function unsubscribeFromMachineLogs(machineId) {
  backendMachineInfo.removeMachineLogsSubscription(machineId);
}

export default {
  removeDeployment,
  startInstance,
  stopInstance,
  pauseInstance,
  resumeInstance,
  updateInstanceTokenState: backendInstanceHandling.updateInstanceTokenState,
  migrateInstances: backendInstanceHandling.migrateInstances,
  deployProcessVersion,
  updateToken,
  getStatus,
  importProcess: backendDeployment.importProcess,
  getFullProcessVersionData: backendDeployment.getFullProcessVersionData,
  completeUserTask,
  updateUserTaskMilestone,
  updateUserTaskIntermediateVariablesState,
  getMachineProperties,
  sendConfiguration,
  getConfiguration,
  getLogs,
  startMachinePolling,
  stopMachinePolling,
  subscribeToMachine,
  unsubscribeFromMachine,
  subscribeToMachineLogs,
  unsubscribeFromMachineLogs,
};
