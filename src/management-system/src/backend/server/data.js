import store from '../shared-electron-server/data/store.js';
import {
  getEnvProfileJSON,
  saveEnvProfile,
  deleteEnvProfile,
} from '../shared-electron-server/data/fileHandling.js';
import * as backendCapabilities from '../shared-electron-server/data/capabilities.js';
import * as backendConfig from '../shared-electron-server/data/config.js';
import eventHandler from '../../frontend/backend-api/event-system/EventHandler.js';
import logger from '../shared-electron-server/logging.js';

export function setupDataRequestHandlers(addListener, broadcast) {
  addListener('data_get', (socket, id, storeName) => {
    logger.debug(`Request for data from ${storeName} store.`);

    if (storeName === 'capabilities') {
      socket.emit('data_get', id, backendCapabilities.getCapabilities());
      return;
    }

    if (storeName === 'config') {
      socket.emit('data_get', id, backendConfig.getBackendConfig());
      return;
    }

    socket.emit('data_get', id, store.get(storeName));
  });

  addListener('data_set', (socket, id, storeName, key, value, userId) => {
    logger.debug(`Request to overwrite data of ${storeName} store.`);
    socket.emit('data_set', id, store.set(storeName, key, value, userId));
  });

  addListener('data_add', (socket, id, storeName, newElement) => {
    logger.debug(`Request to add new element to ${storeName} store.`);

    // route machine changes through separate Controller
    let result;
    result = store.add(storeName, newElement);
    socket.emit('data_add', id, result);
  });

  addListener('data_remove', (socket, id, storeName, elementId) => {
    logger.debug(`Request to remove element from ${storeName} store.`);

    let result;
    result = store.remove(storeName, elementId);
    socket.emit('data_remove', id, result);
  });

  addListener('data_update', (socket, id, storeName, elementId, updatedInfo) => {
    logger.debug(`Request to update element in ${storeName} store.`);

    let result;
    result = store.update(storeName, elementId, updatedInfo);
    socket.emit('data_update', id, result);
  });

  addListener('config_update', (socket, id, newValues) => {
    logger.debug(`Request to update the config.`);

    backendConfig.changeBackendConfig(newValues);

    socket.emit('config_update', id);
  });

  addListener('data_getEnvProfileJSON', async (socket, id, _id, type) => {
    socket.emit('data_getEnvProfileJSON', id, await getEnvProfileJSON(_id, type));
  });

  addListener('data_saveEnvProfile', async (socket, id, _id, type, environmentProfile) => {
    await saveEnvProfile(_id, type, environmentProfile);
    socket.emit('data_saveEnvProfile', id);
  });

  addListener('data_deleteEnvProfile', async (socket, id, _id, type) => {
    await deleteEnvProfile(_id, type);
    socket.emit('data_deleteEnvProfile', id);
  });

  eventHandler.on('machineAdded', ({ machine }) => {
    logger.debug(`Broadcasting of newly added machine.`);
    broadcast('machine_added', machine);
  });

  eventHandler.on('machineRemoved', ({ machineId }) => {
    logger.debug('Broadcasting of removed machine');
    broadcast('machine_removed', machineId);
  });

  eventHandler.on('machineUpdated', ({ oldId, updatedInfo }) => {
    logger.debug('Broadcasting of machine update');
    broadcast('machine_updated', oldId, updatedInfo);
  });

  eventHandler.on('capabilitiesChanged', ({ capabilities }) => {
    logger.debug(`Broadcasting change in capabilities store.`);
    broadcast('capabilities_changed', capabilities);
  });

  eventHandler.on('store_environmentProfilesChanged', ({ data }) => {
    logger.debug(`Broadcasting change in environment profiles store.`);
    broadcast('environment-profiles_changed', data);
  });

  eventHandler.on('store_environmentProfile_added', ({ environmentProfile }) => {
    logger.debug(`Broadcasting the addition of a new environment profile.`);
    broadcast('environmentProfile_added', environmentProfile);
  });

  eventHandler.on('store_environmentProfile_removed', ({ environmentProfileId }) => {
    logger.debug('Broadcasting the removal of an environment profile.');
    broadcast('environmentProfile_removed', environmentProfileId);
  });

  eventHandler.on('store_environmentProfile_updated', ({ oldId, updatedInfo }) => {
    logger.debug('Broadcasting the update of a environment profile.');
    broadcast('environmentProfile_updated', oldId, updatedInfo);
  });

  eventHandler.on('backendConfigChanged', (changedValues) => {
    logger.debug(`Broadcasting change in config store.`);
    broadcast('config_changed', changedValues);
  });
}
