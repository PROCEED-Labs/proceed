import { listen, emit, request } from './socket.js';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';

async function importProcess(processDefinitionsId) {
  await request('process_import', processDefinitionsId);
}

async function removeDeployment(processDefinitionsId) {
  await request('deployment_remove', processDefinitionsId);
}

async function startInstance(processDefinitionsId, version) {
  const [response] = await request('instance_start', processDefinitionsId, version);

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
}

async function stopInstance(processDefinitionsId, instanceId) {
  await request('instance_stop', processDefinitionsId, instanceId);
}

async function pauseInstance(processDefinitionsId, instanceId) {
  await request('instance_pause', processDefinitionsId, instanceId);
}

async function resumeInstance(processDefinitionsId, instanceId) {
  await request('instance_resume', processDefinitionsId, instanceId);
}

async function updateInstanceTokenState(processDefinitionsId, instanceId, tokenChanges) {
  await request('instance_tokens_update', processDefinitionsId, instanceId, tokenChanges);
}

async function migrateInstances(
  definitionId,
  currentVersion,
  targetVersion,
  instanceIds,
  migrationArgs,
) {
  const [response] = await request(
    'instances_migrate_version',
    definitionId,
    currentVersion,
    targetVersion,
    instanceIds,
    migrationArgs,
  );

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
}

async function deployProcessVersion(processDefinitionsId, version, dynamic) {
  const [response] = await request('deployment_deploy', processDefinitionsId, version, dynamic);

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
}

async function updateToken(processDefinitionsId, instanceId, tokenId, attributes) {
  await request('instance_token_update', processDefinitionsId, instanceId, tokenId, attributes);
}

async function getStatus(machineId) {
  const [running] = await request('machine_status_get', machineId);
  return running;
}

async function getFullProcessVersionData(processDefinitionsId, version) {
  const [response] = await request('version_data_get', processDefinitionsId, version);
  if (response.error) {
    throw new Error(response.err);
  }
  return response;
}

async function completeUserTask(instanceId, userTaskId) {
  await request('user_task_complete', instanceId, userTaskId);
}

async function updateUserTaskMilestone(instanceId, userTaskId, milestone) {
  await request('user_task_milestone_update', instanceId, userTaskId, milestone);
}

async function updateUserTaskIntermediateVariablesState(instanceId, userTaskId, variable) {
  await request('user_task_variable_update', instanceId, userTaskId, variable);
}

async function getMachineProperties(machineId, properties) {
  const [resProperties] = await request('machine_properties_get', machineId, properties);
  return resProperties;
}

async function sendConfiguration(machineId, configuration) {
  await request('machine_configuration_set', machineId, configuration);
}

async function getConfiguration(machineId) {
  const [configuration] = await request('machine_configuration_get', machineId);
  return configuration;
}

// TODO: fix error with native-fs: unexpected end of json input
async function getLogs(machineId) {
  const [logs] = await request('machine_logs_get', machineId);
  return logs;
}

async function startMachinePolling() {
  await request('machines_polling_start');
}

async function stopMachinePolling() {
  await request('machines_polling_stop');
}

async function subscribeToMachine(machineId) {
  emit('machine_info_subscribe', machineId);
}

async function unsubscribeFromMachine(machineId) {
  emit('machine_info_unsubscribe', machineId);
}

async function subscribeToMachineLogs(machineId) {
  emit('machine_logs_subscribe', machineId);
}

async function unsubscribeFromMachineLogs(machineId) {
  emit('machine_logs_unsubscribe', machineId);
}

export function setNetworkListener() {
  listen('new-machine-info', (machineId, info) => {
    eventHandler.dispatch('newMachineInfo', { id: machineId, info });
  });

  listen('new-machine-logs', (machineId, logs) => {
    eventHandler.dispatch('newMachineLogs', { id: machineId, logs });
  });
}

export default {
  removeDeployment,
  startInstance,
  stopInstance,
  pauseInstance,
  resumeInstance,
  updateInstanceTokenState,
  migrateInstances,
  deployProcessVersion,
  updateToken,
  getStatus,
  importProcess,
  getFullProcessVersionData,
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
