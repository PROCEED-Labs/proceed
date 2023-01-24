import { getMachines } from '../data/machines.js';
import {
  statusEndpoint,
  machineEndpoint,
  configurationEndpoint,
  loggingEndpoint,
} from './ms-engine-communication/module.js';

function getMachine(machineId) {
  const machine = getMachines().find((sMachine) => sMachine.id === machineId);

  if (!machine) {
    throw new Error("Can't find machine with given id!");
  }

  if (!machine.status === 'CONNECTED') {
    throw new Error('Machine unreachable!');
  }

  return machine;
}

/**
 * Requests and returns information if the engine with the given id is running a proceed engine
 *
 * @param {String} machineId the id of the machine we want to know the status of
 * @returns {Boolean} - if the machine is running a proceed engine
 */
export async function getStatus(machineId) {
  const machine = getMachine(machineId);

  const running = await statusEndpoint.getStatus(machine);

  return running;
}

/**
 * Requests and returns the properties for the given machine, desired properties can be specified
 *
 * @param {String} machineId
 * @param {Array} properties names of the desired properties
 * @returns {Object} - object containing the requested properties and their values
 */
export async function getMachineProperties(machineId, properties) {
  const machine = getMachine(machineId);

  const machineProperties = await machineEndpoint.getProperties(machine, properties);

  return machineProperties;
}

/**
 * Sends a configuration to an engine which it is supposed to use
 *
 * @param {String} machineId
 * @param {Object} configuration object containing config values
 */
export async function sendConfiguration(machineId, configuration) {
  const machine = getMachine(machineId);

  await configurationEndpoint.sendConfiguration(machine, configuration);
}

/**
 * Requests and returns the configuration of the engine on another machine
 *
 * @param {String} machineId
 * @returns {Object} - contains config values
 */
export async function getConfiguration(machineId) {
  const machine = getMachine(machineId);

  const configuration = await configurationEndpoint.getConfiguration(machine);

  return configuration;
}

/**
 * Requests and returns the logs of the engine on another machine
 *
 * @param {String} machineId
 * @returns {Object} - Object containing logs for the engine and process execution
 */
export async function getLogs(machineId) {
  const machine = getMachine(machineId);

  const logs = await loggingEndpoint.getLogs(machine);

  return logs;
}
