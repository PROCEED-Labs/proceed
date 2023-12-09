import eventHandler from './eventHandler.js';
import defaultBackendConfig from './config_backend_default.js';
import { mergeIntoObject, deepEquals } from '../../helpers/javascriptHelpers';
import store from './store.js';

// The merged config
let config = { ...defaultBackendConfig };

/**
 * Creates the initial config which is a merge of the user config and the default config
 *
 * @returns {Object} the initial config
 */
export function init() {
  config = { ...defaultBackendConfig };

  const backendConfig = store.get('config');

  // merge user config values that correspond to a default config key into the overall config
  mergeIntoObject(config, backendConfig, true, true, true);

  return config;
}

/**
 * Returns the current config values
 *
 * @returns {Object} the current config values
 */
export function getBackendConfig() {
  return JSON.parse(JSON.stringify(config));
}

/**
 * Merges proposed config changes into the backend config object, updates the store and emits an event if at least one entry was changed
 *
 * @param {Object} newValues key value pairs of proposed config changes
 */
export function changeBackendConfig(newValues) {
  // create new config object that will replace the old one
  const newConfig = JSON.parse(JSON.stringify(config));
  // merge values into new config object and get all values that were actually changed
  const changedValues = mergeIntoObject(newConfig, newValues, true, true, true);

  // flag values that got set back to default for removal from user config file
  const cleanedValues = Object.entries(changedValues).reduce((acc, [key, value]) => {
    if (deepEquals(defaultBackendConfig[key], value)) {
      acc[key] = undefined;
    } else {
      acc[key] = value;
    }

    return acc;
  }, {});

  // emit event for every changed value
  for (const key in changedValues) {
    eventHandler.dispatch(`backendConfigChange.${key}`, {
      newValue: changedValues[key],
      oldValue: config[key],
    });
  }

  // overwrite config object
  config = newConfig;

  // persistently store all values that differ from the default config
  Object.entries(cleanedValues).forEach(([key, value]) => {
    store.set('config', key, value);
  });

  // dispatch event that signals general config change
  if (Object.keys(changedValues).length) {
    eventHandler.dispatch('backendConfigChanged', changedValues);
  }
}

init();
