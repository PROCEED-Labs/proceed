// Module responsible for updating the information about the different machines known to the MS

import {
  statusEndpoint,
  machineEndpoint,
  processEndpoint,
} from '../ms-engine-communication/module.js';
import logger from '../../logging.js';
import helpers from '../../../../shared-frontend-backend/helpers/javascriptHelpers.js';
const { deepEquals, asyncMap } = helpers;

/**
 * Sends request checking if there is an engine running on the given machine
 *
 * @param {object} machine
 * @param {string} machine.ip the ip of the given machine
 * @param {number} machine.port the port the engine is accessible through
 * @returns {Promise<boolean>} indicates if the machine is available or not
 */
export async function checkAvailability(machine) {
  // check if machine is reachable and running an engine; enforce usage of node http to avoid error in V8
  const available = await statusEndpoint.getStatus(machine);

  return available;
}

/**
 * Returns the updated information for a machine if the machine information changed (returns undefined if not)
 *
 * @param {Object} machine the machine we want to request information for
 * @returns {Object|undefined} the updated object or undefined if there was no new information
 */
export async function getCompleteMachineInformation(machine) {
  let updated = false;
  let updatedMachine = { ...machine };

  const { name, hostname, ip } = machine;

  logger.debug(`Sending GET request to ${name || hostname || ip} to get machine info!`);
  const properties = await machineEndpoint.getProperties(machine);

  //delete some values that change to often to be stored (or just don't make sense to store)
  const { cores, physicalCores, processors, speed } = properties.cpu;

  properties.cpu = { cores, physicalCores, processors, speed };
  properties.mem = { total: properties.mem.total };
  properties.disk = properties.disk.map(({ type, total }) => ({ type, total }));
  properties.battery = { hasBattery: properties.battery.hasBattery };

  const metainfo = ['id', 'hostname', 'name', 'description'];

  Object.entries(properties).forEach(([propertyName, value]) => {
    if (value !== machine.machine[propertyName]) {
      updatedMachine.machine[propertyName] = value;
      updated = true;
    }

    if (metainfo.includes(propertyName)) {
      if (value !== updatedMachine[propertyName]) {
        updatedMachine[propertyName] = value;
        updated = true;
      }
    }
  });

  if (updated) {
    return updatedMachine;
  }
}
