import { listen, request } from './socket.js';
import restRequest from './rest.js';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';

async function get(storeName) {
  const [data] = await request('data_get', storeName);
  return data;
}

async function set(storeName, key, value, userId) {
  return request('data_set', storeName, key, value, userId);
}

async function addToStore(storeName, newElement) {
  await request('data_add', storeName, newElement);
}

async function removeFromStore(storeName, elementId) {
  await request('data_remove', storeName, elementId);
}

async function updateInStore(storeName, elementId, updatedInfo) {
  await request('data_update', storeName, elementId, updatedInfo);
}

async function updateConfig(newValues) {
  await request('config_update', newValues);
}

async function getMachines() {
  const machines = await restRequest('machines');
  return machines;
}

async function addMachine(machineInfo) {
  await restRequest('machines', undefined, 'POST', 'application/json', machineInfo);
}

async function removeMachine(machineId) {
  await restRequest(`machines/${machineId}`, undefined, 'DELETE');
}

async function updateMachine(machineId, machineUpdates) {
  await restRequest(`machines/${machineId}`, undefined, 'PUT', 'application/json', machineUpdates);
}

async function getEnvProfileJSON(id, type) {
  const [environmentProfile] = await request('data_getEnvProfileJSON', id, type);
  return environmentProfile;
}

async function saveEnvProfile(id, type, environmentProfile) {
  return request('data_saveEnvProfile', id, type, environmentProfile);
}

async function deleteEnvProfile(id, type) {
  return request('data_deleteEnvProfile', id, type);
}

export function setDataListener() {
  listen('machine_added', (machine) => {
    eventHandler.dispatch('machineAdded', { machine });
  });

  listen('machine_removed', (machineId) => {
    eventHandler.dispatch('machineRemoved', { machineId });
  });

  listen('machine_updated', (oldId, updatedInfo) => {
    eventHandler.dispatch('machineUpdated', { oldId, updatedInfo });
  });

  listen('capabilities_changed', (capabilities) => {
    eventHandler.dispatch('capabilitiesChanged', { capabilities });
  });

  listen('environment-profiles_changed', (environmentProfiles) => {
    eventHandler.dispatch('environmentProfilesChanged', environmentProfiles);
  });

  listen('environmentProfile_added', (environmentProfile) => {
    eventHandler.dispatch('environmentProfileAdded', { environmentProfile });
  });

  listen('environmentProfile_removed', (environmentProfileId) => {
    eventHandler.dispatch('environmentProfileRemoved', { environmentProfileId });
  });

  listen('store_environmentProfile_updated', (oldId, updatedInfo) => {
    eventHandler.dispatch('environmentProfileUpdated', { oldId, updatedInfo });
  });

  listen('users_changed', (users) => {
    eventHandler.dispatch('usersChanged', users);
  });

  listen('config_changed', (config) => {
    eventHandler.dispatch('backendConfigChanged', config);
  });
}

export default {
  get,
  set,
  addToStore,
  removeFromStore,
  updateInStore,
  getMachines,
  addMachine,
  removeMachine,
  updateMachine,
  updateConfig,
  getEnvProfileJSON,
  saveEnvProfile,
  deleteEnvProfile,
};
