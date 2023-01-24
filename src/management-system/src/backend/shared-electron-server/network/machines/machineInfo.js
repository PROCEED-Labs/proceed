import { getMachines, updateMachine } from '../../data/machines.js';
import {
  machineEndpoint,
  configurationEndpoint,
  loggingEndpoint,
} from '../ms-engine-communication/module.js';
import { checkAvailability, getCompleteMachineInformation } from './machineInfoRequests.js';
import logger from '../../logging.js';
import eventHandler from '../../../../frontend/backend-api/event-system/EventHandler.js';
import helpers from '../../../../shared-frontend-backend/helpers/javascriptHelpers.js';
const { isSubset } = helpers;

import { getBackendConfig } from '../../data/config.js';

// number of seconds between two request for machine information
let updateInterval = getBackendConfig().machinePollingInterval;

if (typeof updateInterval === 'string') {
  updateInterval = parseInt(updateInterval, 10);
}

eventHandler.on('backendConfigChange.machinePollingInterval', ({ newValue }) => {
  updateInterval = newValue;
});

/**
 * Allows changing the time between two consecutive machine information requests
 *
 * @param {Number} newInterval the new time between two requests (in seconds)
 */
export function setUpdateInterval(newInterval) {
  updateInterval = newInterval;
}

/**
 * Returns the time between two requests for machine information
 *
 * @returns {Number} the interval time
 */
export function getUpdateInterval() {
  return updateInterval;
}

// contains the machineIds of machines that were subscribed to and which information was requested
let subscribedToMachines = {};

let pollMachines = false;
let polling = false;

/**
 * Activates a polling loop that requests information from all machines
 */
export function startPolling() {
  pollMachines = true;
  logger.debug('Start polling machines for up to date information');
  if (!polling) {
    pollMachinesInformation();
  }
}

/**
 * Deactivates the machine polling loop
 */
export function stopPolling() {
  logger.debug('Stop polling machines for information');
  pollMachines = false;
}

/**
 * Occasionally polls all machines for up to date informations
 */
async function pollMachinesInformation() {
  polling = true;
  const machines = getMachines();

  const pollPromises = machines.map(async (machine) => {
    let newInfo = {};

    try {
      // check if machines are reachable
      const running = await checkAvailability(machine);

      if (running) {
        let { optionalName, hostname, id, name } = machine;

        // request updated information for subscribed to machines
        if (subscribedToMachines[machine.id]) {
          logger.debug(
            `Requesting up to date information for machine ${
              optionalName || name || hostname || id
            }.`
          );
          const properties = await machineEndpoint.getProperties(machine);

          eventHandler.dispatch('newMachineInfo', {
            id: machine.id,
            info: {
              cpu: properties.cpu,
              mem: properties.mem,
              disk: properties.disk,
              battery: properties.battery,
            },
          });

          //delete some values that change to often to be stored (or just don't make sense to store)
          const { cores, physicalCores, processors, speed } = properties.cpu;

          properties.cpu = { cores, physicalCores, processors, speed };
          properties.mem = { total: properties.mem.total };
          properties.disk = properties.disk.map(({ type, total }) => ({ type, total }));
          properties.battery = { hasBattery: properties.battery.hasBattery };

          // see if log information is requested too
          if (subscribedToMachines[machine.id].logs) {
            logger.debug(`Requesting logs from machine ${optionalName || name || hostname || id}.`);
            const logs = await loggingEndpoint.getLogs(machine);
            eventHandler.dispatch('newMachineLogs', {
              id: machine.id,
              logs,
            });
          }

          newInfo.machine = properties;
          newInfo.id = properties.id;
          newInfo.name = properties.name;
          newInfo.hostname = properties.hostname;
          newInfo.description = properties.description;
        }

        // log if machine was connected to for the first time
        if (machine.status === 'DISCONNECTED') {
          logger.info(
            `Established first connection to machine ${
              optionalName || name || hostname || id
            }. Requesting information.`
          );

          newInfo = await getCompleteMachineInformation(machine);
        }

        newInfo.status = 'CONNECTED';

        // check if machine information changed and update if it did
        if (!isSubset(machine, newInfo)) {
          await updateMachine(machine.id, newInfo);
        }

        return;
      }
    } catch (err) {
      console.log(err);
      // log if connection failed but was connected before
      if (machine.status === 'CONNECTED') {
        const { optionalName, hostname, id, name } = machine;
        logger.info(`Lost connection to machine ${optionalName || name || hostname || id}.`);
        newInfo.online = false;
      }
    }

    newInfo.status = 'DISCONNECTED';

    // see if information changed and update if it did
    if (!isSubset(machine, newInfo)) {
      await updateMachine(machine.id, newInfo);
    }
  });

  await Promise.all(pollPromises);

  setTimeout(() => {
    // repeat after timeout if polling is still requested then
    if (pollMachines) {
      pollMachinesInformation();
    } else {
      // set flag to allow loop to be started again in the future
      polling = false;
    }
  }, updateInterval * 1000);
}

/**
 * Set flag that we want extended information for a specific machine
 *
 * @param {String} machineId machine that more information is requested for
 */
export function addMachineSubscription(machineId) {
  if (!subscribedToMachines[machineId]) {
    subscribedToMachines[machineId] = { logs: false };
  }
}

/**
 * Remove flag for extended information about a specific machine
 *
 * @param {String} machineId machine for which extended information is not needed anymore
 */
export function removeMachineSubscription(machineId) {
  delete subscribedToMachines[machineId];
}

/**
 * Set flag that logs for a machine are requested
 *
 * @param {String} machineId the machine for which logs are requested
 */
export function addMachineLogsSubscription(machineId) {
  subscribedToMachines[machineId].logs = true;
}

/**
 * Remove flag so that logs for the machine are not requested anymore
 *
 * @param {String} machineId the machine for which logs are not needed anymore
 */
export function removeMachineLogsSubscription(machineId) {
  if (subscribedToMachines[machineId]) {
    subscribedToMachines[machineId].logs = false;
  }
}
