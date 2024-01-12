import Conf from 'conf';
import path from 'path';
import { getAppDataPath } from './fileHandling.js';
import eventHandler from './eventHandler.js';

const keyValueStores = ['config', 'instances', 'deployments'];

/**
 * Creates a new conf store that is used to store the current state of something
 *
 * @param {String} storeName the name of the store referencing the thing we want to store
 * @param {undefined|Object|Array} defaultVal the default layout of the store that is used when creating it
 * @param {Boolean} noStorage used to signal if the store is supposed to be stored in the Storage subdirectory
 */
function getStore(storeName, defaultVal, subDir = 'Storage') {
  let appDir = getAppDataPath();
  const storageDir = path.join(appDir, subDir);

  // different structure for role mappings
  if (storeName === 'roleMappings')
    return new Conf({
      configName: storeName,
      cwd: storageDir,
      defaults: { [storeName]: { users: {} } },
    });

  return new Conf({
    configName: storeName,
    cwd: storageDir,
    defaults: defaultVal ? defaultVal : { [storeName]: [] },
  });
}

// contains all stores we need
let stores = global.stores;
if (!global.stores) {
  stores = global.stores = {};
  // usually all storages are inside the 'storageDir'
  stores.capabilities = { store: getStore('capabilities') };
  stores.processes = { store: getStore('processes') };
  stores.deployments = { store: getStore('deployments', {}) };
  stores.instances = { store: getStore('instances', {}) };
  stores.machines = { store: getStore('machines') };
  resetMachines();
  stores.environmentProfiles = { store: getStore('environmentProfiles') };
  stores.environmentConfig = { store: getStore('environmentConfig', { environmentConfig: {} }) };
  stores.config = { store: getStore('config', {}, 'Config') }; // true => store directly in app/root dir
  stores.userPreferences = { store: getStore('userPreferences', {}) };
  stores.resources = { store: getStore('resources') };
  stores.shares = { store: getStore('shares') };
  stores.roles = { store: getStore('roles') };
  stores.roleMappings = { store: getStore('roleMappings') };
  stores.users = { store: getStore('users') };
}

/**
 * Gets the value of the store with the given name
 *
 * @param {String} store the name of the store we want to get
 */
function get(storeName) {
  // The config store has a different layout from the others
  /**
   * ConfigStore: { key1: val1, ... }
   * Others: { storeName: [storeVals] }
   *
   */
  if (keyValueStores.includes(storeName) || storeName === 'roleMappings') {
    return stores[storeName].store.get();
  } else {
    return stores[storeName].store.get(storeName);
  }
}

function set(storeName, key, data, userId) {
  const oldData = keyValueStores.includes(storeName) ? get(storeName)[key] : get(storeName);
  if (data === undefined) {
    stores[storeName].store.delete(key);
  } else {
    if (userId) {
      stores[storeName].store.set(`${key}.${userId}`, data);
    } else {
      stores[storeName].store.set(key, data);
    }
  }
  eventHandler.dispatch(`store_${storeName}Changed`, { oldData, data, key });
}

/**
 * Allows the manipulation of specific objects in the given store
 * BEWARE: Don't use this on the config store
 *
 * @param {string} storeName
 * @param {object} idUpdateMap object with key value pairs
 * @param {string} key: the id of the object we want to change
 * @param {object} value: the new value for the object we want to change
 */
function updateByIds(storeName, idUpdateMap) {
  const state = get(storeName);
  const oldState = [...state];

  const updates = {};

  Object.entries(idUpdateMap).forEach(([id, update]) => {
    const index = state.findIndex((object) => object.id === id);
    if (index < 0) {
      // do nothing if the object doesn't exist
      return;
    }
    updates[id] = { oldState: state[index], newState: update };

    // overwrite the old object with the updated one
    state[index] = update;
  });

  if (Object.keys(updates).length) {
    stores[storeName].store.set(storeName, state);
    eventHandler.dispatch(`store_${storeName}Updated`, { oldData: oldState, data: state, updates });
  }
}

/**
 * Returns singular form of a stores name (machines => machine)
 *
 * @param {String} storeName plural
 * @returns {Strings} - singular
 */
function getSingular(storeName) {
  switch (storeName) {
    case 'processes':
      return 'process';
    case 'capabilities':
      return 'capability';
    default:
      return storeName.slice(0, storeName.length - 1);
  }
}

/**
 * Function to add an element to the stores which store elements with ids (machines, processes, etc.) (NOT! config)
 *
 * Does check if element with the same id is already in store
 *
 * @param {String} storeName the name of the store we want to add to
 * @param {Object} newElement the object we want to add
 * @returns {Boolean} - if adding was possible (don't add if element with same id exists)
 */
function add(storeName, newElement) {
  let state = get(storeName);

  const sameId = state.find((el) => el.id === newElement.id);

  if (sameId) {
    return false;
  } else {
    state = [...state, newElement];

    stores[storeName].store.set(storeName, state);

    // get the singular form of the store (machines => machine)
    const elementName = getSingular(storeName);

    eventHandler.dispatch(`store_${elementName}_added`, { [elementName]: newElement });
    return true;
  }
}

/**
 * Function to set an element in dictionary format
 *
 * @param {String} storeName the name of the store we want to add to
 * @param {Object} newItem the object we want to add
 */
function setDictElement(storeName, newItem) {
  stores[storeName].store.set(newItem);
}

/**
 * Function to remove an element from a store (store has to have property like with add)
 *
 * @param {String} storeName name of the store we want to remove from
 * @param {String} elementId id of the element we want to remove
 */
function remove(storeName, elementId) {
  let state = get(storeName);

  const elementIndex = state.findIndex((el) => el.id === elementId);

  if (elementIndex > -1) {
    state.splice(elementIndex, 1);

    stores[storeName].store.set(storeName, state);

    // get the singular form of the store (machines => machine)
    const elementName = getSingular(storeName);

    eventHandler.dispatch(`store_${elementName}_removed`, { [`${elementName}Id`]: elementId });
  }
}

/**
 * Function to remove an element from a store in dictionary format
 *
 * @param {String} storeName name of the store we want to remove from
 * @param {String} elementId id of the element we want to remove
 * @param {String} itemId only if nested item in element should be removed
 */
function removeDictElement(storeName, elementId, itemId = null) {
  let state = get(storeName);

  if (state[elementId]) {
    if (itemId) {
      delete state[elementId][itemId];
    } else {
      delete state[elementId];
    }

    stores[storeName].store.set(storeName, state);
  }
}

/**
 * Function to update a single value inside one of the stores
 *
 * @param {String} storeName the name of the store we want to update something in
 * @param {String} elementId the id of the element we want to update
 * @param {Object} updatedInfo the info we want to overwrite the current one with
 */
function update(storeName, elementId, updatedInfo) {
  const state = get(storeName);

  const index = state.findIndex((el) => el.id === elementId);

  if (index < 0) {
    // do nothing if the object doesn't exist
    return;
  }
  // overwrite the old object with the updated one
  state[index] = updatedInfo;

  stores[storeName].store.set(storeName, state);

  // get the singular form of the store (machines => machine)
  const elementName = getSingular(storeName);

  eventHandler.dispatch(`store_${elementName}_updated`, { oldId: elementId, updatedInfo });
}

function getById(storeName, id) {
  return get(storeName).find((el) => el.id === id);
}

function resetMachines() {
  const machines = get('machines');

  const resetMachines = machines
    .map((d) => ({ ...d, status: 'DISCONNECTED' }))
    .map((d) => ({ ...d, ip: d.ip || (d.location && d.location.replace('http://', '')) }));

  set('machines', 'machines', resetMachines);
}

export function getStorePath(storeName) {
  return stores[storeName].store._options.cwd;
}

const storeFunctions = {
  get,
  set,
  add,
  setDictElement,
  remove,
  removeDictElement,
  update,
  getById,
  updateByIds,
  getStorePath,
};

export default storeFunctions;
