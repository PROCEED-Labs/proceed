import communicationEx from '@proceed/distribution';
const { communication } = communicationEx;
import store from './store.js';
import eventHandler from '../../../frontend/backend-api/event-system/EventHandler.js';
import ExecutionQueue from '../../../shared-frontend-backend/helpers/execution-queue.js';
import {
  checkAvailability,
  getCompleteMachineInformation,
} from '../network/machines/machineInfoRequests.js';
import helpers from '../../../shared-frontend-backend/helpers/javascriptHelpers.js';
const { deepEquals, isSubset } = helpers;
import logger from '../logging.js';

const queue = new ExecutionQueue();

// merge between added and discovered machines
let known = {};

/**
 * Goes through the known machines searching for a machine that matches the given machine in some way
 *
 * @param {Object} machine the machine we want to find a matching machine for
 * @returns {String|undefined} the id of the matching machine in known (or undefined for no matching)
 */
function findMatchingMachineId(machine) {
  const matching = Object.values(known).find((knownMachine) => {
    const idMatch = knownMachine.id === machine.id;

    // user submitted machine matches the network information
    const networkMatch =
      knownMachine.ip === machine.ip &&
      knownMachine.port === machine.port &&
      (!knownMachine.hostname || !machine.hostname);

    // user submitted machine matches hostname
    const hostnameMatch =
      knownMachine.hostname === machine.hostname && (!knownMachine.ip || !machine.ip);

    // machine matches identifying information except id
    const sameInfoDiffId =
      machine.hostname === knownMachine.hostname &&
      machine.ip === knownMachine.ip &&
      machine.port === knownMachine.port;

    // check if machines match in some way
    return idMatch || networkMatch || hostnameMatch || sameInfoDiffId;
  });

  if (matching) {
    return matching.id;
  }
}

/**
 * Handles machines that are added by the user
 *
 * @param {Object} machine contains user defined information about the machine to add
 */
export async function addMachine(addedMachine, fromDiscovery = false) {
  // add flags and info based on where the machine is coming from (discovery/user)
  if (fromDiscovery) {
    addedMachine = { ...addedMachine, discovered: true, status: 'CONNECTED' };
  } else {
    addedMachine = { ...addedMachine, saved: true, status: 'DISCONNECTED' };
  }

  if (!addedMachine.machine) {
    addedMachine.machine = {};
  }

  const { currentlyConnectedEnvironments, hostname } = addedMachine;
  delete addedMachine.currentlyConnectedEnvironments;

  if (currentlyConnectedEnvironments) {
    addedMachine.machine.currentlyConnectedEnvironments = currentlyConnectedEnvironments;
  }
  if (hostname) {
    addedMachine.machine.hostname = hostname;
  }

  await queue.enqueue(async () => {
    // critical area making sure that the list of known machines is not changed while in it

    // check if there is some machine that would match this one
    const matching = findMatchingMachineId(addedMachine);
    let commitedMachine;

    if (matching) {
      let merge;
      if (fromDiscovery) {
        // we expect discovered machines to have preferred/correct information
        merge = { ...known[matching], ...addedMachine };
      } else {
        // we expect user submitted machines to not have "more correct" information than the already known ones
        merge = { ...addedMachine, ...known[matching] };
        merge.optionalName = addedMachine.optionalName;
        merge.saved = true;
      }
      updateMachine(matching, merge);
      commitedMachine = merge;
    } else {
      if (!fromDiscovery) {
        // add user submitted machine to store
        store.add('machines', removeExcessiveInformation(addedMachine));
      }
      known[addedMachine.id] = addedMachine;
      eventHandler.dispatch('machineAdded', { machine: addedMachine });
      commitedMachine = addedMachine;
    }

    // make initial pull for information from machine
    getMachineInformationAndUpdate({ ...commitedMachine });
  });
}

/**
 * Request information from a machine and update the local information on response
 *
 * @param {Object} machine current information about the machine
 */
async function getMachineInformationAndUpdate(machine) {
  try {
    const running = await checkAvailability(machine);

    if (running) {
      machine.status = 'CONNECTED';
      // save id that might be overwritten
      const oldId = machine.id;

      // request up to date info from machine
      machine = await getCompleteMachineInformation(machine);

      updateMachine(oldId, machine);
    } else {
      machine.status = 'DISCONNECTED';
    }
  } catch (err) {
    const { optionalName, hostname, id } = machine;
    logger.debug(`Unable to connect to machine ${optionalName || hostname || id}.`);
    machine.status = 'DISCONNECTED';
  }
}

/**
 * Handles machines that are removed by the user
 *
 * @param {String} machineId id of the machine to remove
 */
export async function removeMachine(machineId) {
  await updateMachine(machineId, { saved: false });
}

export async function updateMachine(machineId, updatedInfo) {
  await queue.enqueue(async () => {
    if (known[machineId]) {
      // we don't allow changing the hostname, ip, port or id of a connected machine
      if (known[machineId].status === 'CONNECTED') {
        delete updatedInfo.ip;
        delete updatedInfo.port;
        delete updatedInfo.hostname;
        delete updatedInfo.id;
      }

      // check if we are actually getting new info
      if (!isSubset(known[machineId], updatedInfo)) {
        let merge = { ...known[machineId], ...updatedInfo };

        // update in store if necessary
        updateStoreIfInfoChanged(known[machineId], merge);

        if (!merge.saved && !merge.discovered) {
          // machine is neither in discovery nor in the store => remove
          delete known[machineId];
          eventHandler.dispatch('machineRemoved', { machineId });
        } else {
          // check if id changed so we can update entry in known
          if (updatedInfo.id && updatedInfo.id !== machineId) {
            delete known[machineId];

            // if we change id we might actually allready know the machine with the new id
            // Scenario: discovery adds machine with id 'a' and local network address, user adds same machine but with id 'b' and its open address
            // first request to the machine adds new information and updates with id 'a' => we need to consider the existing information while updating
            if (known[updatedInfo.id]) {
              // make clients remove the machine with the old id and update the one with the correct id
              eventHandler.dispatch('machineRemoved', { machineId });
              merge = { ...known[updatedInfo.id], ...merge };
              machineId = updatedInfo.id;
            }

            known[updatedInfo.id] = merge;
          } else {
            // just update the information and emit change event
            known[machineId] = merge;
          }
          eventHandler.dispatch('machineUpdated', { oldId: machineId, updatedInfo: merge });
        }
      }
    }
  });
}

/**
 * Checks if a change of machine information should trigger a mutation of the backend machine store
 *
 * @param {Object} oldInfo contains the previously known information about a machine
 * @param {Object} newInfo contains the newly available information about a machine
 */
function updateStoreIfInfoChanged(oldInfo, newInfo) {
  // check if we have to make changes in the store
  if (!oldInfo.saved) {
    // not previously stored
    if (newInfo.saved) {
      // should be stored now
      store.add('machines', removeExcessiveInformation(newInfo));
    }
  } else {
    // was already stored
    if (newInfo.saved) {
      // check if store needs to be updated
      const minified = removeExcessiveInformation(newInfo);
      if (!deepEquals(minified, removeExcessiveInformation(oldInfo))) {
        store.update('machines', oldInfo.id, minified);
      }
    } else {
      // remove from store
      store.remove('machines', oldInfo.id);
    }
  }
}

communication.onMachineDiscovery(async (added) => {
  await addMachine(added, true);
});

communication.onMachineUnpublishing(async (removed) => {
  await updateMachine(removed.id, { discovered: false, status: 'DISCONNECTED', online: false });
});

/**
 * Returns an object that contains only the most vital information about an object that we would like to store
 *
 * which is: id, ip, port, hostname, name, optionalName
 *
 * @param {Object} machineInfo a machine information object
 * @returns {Object} - an object that contains a subset of the original object information
 */
function removeExcessiveInformation({ id, ip, port, hostname, optionalName }) {
  return { id, ip, port, hostname, optionalName };
}

export function getMachines() {
  return Object.values(known);
}

export function clearMachines() {
  known = {};
}

function init() {
  queue.enqueue(async () => {
    // wait a second for every system to be started
    // we try to call the stored machines to see if they are online so we need the engine to be completely up and running
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve();
      }, 1000),
    );
    const machines = store.get('machines');
    machines.forEach((machine) => {
      addMachine(machine);
    });
  });
}

// initialize with the machines that are in the store
init();
