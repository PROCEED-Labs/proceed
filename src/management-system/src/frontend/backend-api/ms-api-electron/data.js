import store from '@/backend/shared-electron-server/data/store.js';
import {
  getEnvProfileJSON,
  saveEnvProfile,
  deleteEnvProfile,
} from '@/backend/shared-electron-server/data/fileHandling.js';
import * as backendMachines from '@/backend/shared-electron-server/data/machines.js';
import * as backendCapabilities from '@/backend/shared-electron-server/data/capabilities.js';
import * as backendConfig from '@/backend/shared-electron-server/data/config.js';

function get(storeName) {
  if (storeName === 'capabilities') {
    return backendCapabilities.getCapabilities();
  }

  if (storeName === 'config') {
    return backendConfig.getBackendConfig();
  }

  return store.get(storeName);
}

function set(storeName, key, value) {
  store.set(storeName, key, value);
}

async function addToStore(storeName, newElement) {
  store.add(storeName, newElement);
}

async function removeFromStore(storeName, elementId) {
  store.remove(storeName, elementId);
}

async function updateInStore(storeName, elementId, updatedInfo) {
  store.update(storeName, elementId, updatedInfo);
}

async function updateConfig(newValues) {
  backendConfig.changeBackendConfig(newValues);
}

export default {
  get,
  set,
  addToStore,
  getMachines: backendMachines.getMachines,
  addMachine: backendMachines.addMachine,
  removeMachine: backendMachines.removeMachine,
  updateMachine: backendMachines.updateMachine,
  removeFromStore,
  updateInStore,
  updateConfig,
  getEnvProfileJSON,
  saveEnvProfile,
  deleteEnvProfile,
};
