import * as machineInfo from '../shared-electron-server/network/machines/machineInfo.js';
import eventHandler from '../../frontend/backend-api/event-system/EventHandler.js';
import logger from '../shared-electron-server/logging.js';

// contains information which clients are subscribed to which machine
// keys: machineIds
// values: { subscribers: [the sockets wanting information about cpu, mem ...], logsSubscribers: [the sockets wanting information about the machines logs]}
const subscriptionMap = {};

/**
 * Function that subscribes a client to updates of information about one machine
 *
 * @param {string} machineId
 * @param {object} socket - the connection to the client that wants the information
 */
function subscribeToMachine(machineId, socket) {
  // unsubscribe from all other machines, only one subscription allowed
  unsubscribeFromAllMachines(socket);

  //machine not currently among the ones being requested for information
  if (!subscriptionMap[machineId] || !subscriptionMap[machineId].subscribers.length) {
    machineInfo.addMachineSubscription(machineId);
  }

  // newly subscribe to the machine with the requested id
  if (subscriptionMap[machineId]) {
    subscriptionMap[machineId].subscribers.push(socket);
  } else {
    subscriptionMap[machineId] = { subscribers: [socket], logSubscribers: [] };
  }
}

function unsubscribeFromMachine(machineId, socket) {
  if (subscriptionMap[machineId]) {
    // remove the subscription from the list
    subscriptionMap[machineId].subscribers = subscriptionMap[machineId].subscribers.filter(
      (subSocket) => subSocket !== socket
    );

    if (!subscriptionMap[machineId].subscribers.length) {
      // no one wants information about this machine => stop requesting
      machineInfo.removeMachineSubscription(machineId);
      machineInfo.removeMachineLogsSubscription(machineId);
      delete subscriptionMap[machineId];
    }
  }
}

/**
 * Subscribes a client to the log stream of a machine
 *
 * @param {String} machineId the machine that the client wants information for
 * @param {Object} socket the endpoint for the client that wants the information
 */
function subscribeToMachineLogs(machineId, socket) {
  // we allow only one subscription
  unsubscribeFromAllLogs(socket);

  if (
    !subscriptionMap[machineId] ||
    !subscriptionMap[machineId].subscribers.find((s) => s === socket)
  ) {
    // we expect a generell subscription before we make a log subscription
    subscribeToMachine(machineId, socket);
  }

  if (!subscriptionMap[machineId].logSubscribers.length) {
    // activate the request for the logs in the requesting module when it becomes necessary
    machineInfo.addMachineLogsSubscription(machineId);
  }

  subscriptionMap[machineId].logSubscribers.push(socket);
}

/**
 * Unsubscribes a client from the log stream of a machine
 *
 * @param {String} machineId the machine the client doesn't want logs for anymore
 * @param {Object} socket the endpoint for the client that wants no logs anymore
 */
function unsubscribeFromMachineLogs(machineId, socket) {
  if (subscriptionMap[machineId]) {
    subscriptionMap[machineId].logSubscribers = subscriptionMap[machineId].logSubscribers.filter(
      (subSocket) => subSocket !== socket
    );
    if (!subscriptionMap[machineId].logSubscribers.length) {
      // deactivate log request if no client wants the logs anymore
      machineInfo.removeMachineLogsSubscription(machineId);
    }
  }
}

/**
 * Clears all subscriptions of a client
 *
 * @param {Object} socket the client that unsubscribes
 */
function unsubscribeFromAllMachines(socket) {
  Object.keys(subscriptionMap).forEach((id) => unsubscribeFromMachine(id, socket));
}

/**
 * Clears all log subscriptions of a client
 *
 * @param {Object} socket the client that unsubscribes
 */
function unsubscribeFromAllLogs(socket) {
  Object.keys(subscriptionMap).forEach((id) => unsubscribeFromMachineLogs(id, socket));
}

eventHandler.on('newMachineInfo', ({ id, info }) => {
  if (subscriptionMap[id]) {
    // send the new info to all clients that want information about the machine
    subscriptionMap[id].subscribers.forEach((socket) => {
      socket.emit('new-machine-info', id, info);
    });
  }
});

eventHandler.on('newMachineLogs', ({ id, logs }) => {
  if (subscriptionMap[id]) {
    // send the new logging information to all clients that want it
    subscriptionMap[id].logSubscribers.forEach((socket) => {
      socket.emit('new-machine-logs', id, logs);
    });
  }
});

eventHandler.on('client_disconnected', (socket) => {
  // cleanup after clients that might just disconnect without notice
  unsubscribeFromAllMachines(socket);
  unsubscribeFromAllLogs(socket);
  stopMachinePolling(socket);
});

// subscriptions of clients that want information from all machines
let updateSubscriptions = [];

/**
 * Handles the request of a client for recurring updates about all machines
 *
 * @param {Object} socket the requesting socker
 */
function startMachinePolling(socket) {
  if (!updateSubscriptions.some((s) => s === socket)) {
    // keep track of the subscribed clients
    updateSubscriptions.push(socket);
    // we dont request machine updates if not at least one client needs them
    if (updateSubscriptions.length === 1) {
      machineInfo.startPolling();
    }
  }
}

/**
 * Removes a socket from the list of subscribed sockets and  stops request for updates if no socket remains
 *
 * @param {Object} socket
 */
function stopMachinePolling(socket) {
  const remainingSubscriptions = updateSubscriptions.filter((s) => s !== socket);

  if (remainingSubscriptions.length !== updateSubscriptions.length) {
    // don't poll if no client requires the information anymore
    if (remainingSubscriptions.length === 0) {
      machineInfo.stopPolling();
    }

    updateSubscriptions = remainingSubscriptions;
  }
}

/**
 * Setup handlers for specific subscription requests from clients
 *
 * @param {Function} addListener allows setting callbacks for socket requests from clients
 */
export function setupMachineInfoRequestHandlers(addListener) {
  addListener('machine_info_subscribe', (socket, machineId) => {
    logger.debug(`Request for additional machine info for machine with id ${machineId}.`);
    subscribeToMachine(machineId, socket);
  });

  addListener('machine_info_unsubscribe', (socket, machineId) => {
    logger.debug(
      `Request to unsubscribe from additional machine info for machine with id ${machineId}.`
    );
    unsubscribeFromMachine(machineId, socket);
  });

  addListener('machine_logs_subscribe', (socket, machineId) => {
    logger.debug(`Request for machine logs for machine with id ${machineId}.`);
    subscribeToMachineLogs(machineId, socket);
  });

  addListener('machine_logs_unsubscribe', (socket, machineId) => {
    logger.debug(`Request to unsubscribe from log updated for machine with id ${machineId}.`);
    unsubscribeFromMachineLogs(machineId, socket);
  });

  addListener('machines_polling_start', (socket, id) => {
    startMachinePolling(socket);
    socket.emit('machines_polling_start', id);
  });

  addListener('machines_polling_stop', (socket, id) => {
    stopMachinePolling(socket);
    socket.emit('machines_polling_stop', id);
  });
}
