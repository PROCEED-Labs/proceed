import '../../data/machines.js';
import loggingEx from '@proceed/machine';
const { logging } = loggingEx;
import { capabilitiesEndpoint } from '../ms-engine-communication/module.js';
import { convertSemanticDescription } from './capability-helper.js';
import uuid from 'uuid';
import eventHandler from '../../../../frontend/backend-api/event-system/EventHandler.js';

const configObject = {
  moduleName: 'MS',
  consoleOnly: true,
};

let logger = null;

async function getLogger() {
  if (!logger) {
    logger = await logging.getLogger(configObject);
  }
  return logger;
}

let discovered = [];

eventHandler.on('machinesChanged', async ({ machines: known, oldMachines: oldKnown }) => {
  //new machine connected => discover capabilities
  //machine not connected anymore => remove discovered capabilities
  const oldConnected = oldKnown.filter((machine) => machine.status === 'CONNECTED');

  const disconnects = oldConnected.filter((machine) => {
    // both cases represent machines that are not reachable anymore
    const knownMachine = known.find((kMachine) => machine.id === kMachine.id);
    const removed = !knownMachine;
    let disconnected = false;
    if (knownMachine) {
      disconnected = knownMachine.status !== 'CONNECTED';
    }

    return removed || disconnected;
  });

  const newConnected = known.filter((machine) => machine.status === 'CONNECTED');

  const connects = newConnected.filter((machine) => {
    const oldKnownMachine = oldKnown.find((oKMachine) => machine.id === oKMachine.id);
    const added = !oldKnownMachine;
    let connected;
    if (oldKnownMachine) {
      connected = oldKnownMachine.status !== 'CONNECTED';
    }

    return added || connected;
  });

  let newDiscovered = discovered;

  // remove capabilities of machines that are not reachable anymore
  disconnects.forEach((machine) => {
    const capabilitiesOfMachine = discovered.filter((c) => c.machineIds.includes(machine.id));

    capabilitiesOfMachine.forEach((capability) => {
      const machineIds = capability.machineIds.filter((mId) => mId !== machine.id);
      if (!machineIds.length) {
        newDiscovered = newDiscovered.filter((dCapability) => dCapability !== capability);
      } else {
        capability.machineIds = machineIds;
      }
    });
  });

  // add capabilities from newly reachable machines
  await Promise.all(
    connects.map(async (machine) => {
      await getCapabilities(machine, newDiscovered);
    })
  );

  const oldDiscovered = discovered;
  discovered = newDiscovered;
  eventHandler.dispatch('discovery_capabilitiesChanged', { discovered, oldDiscovered });
});

// get Capabilities for a machine
async function getCapabilities(machine, newDiscovered) {
  try {
    const { hostname, name, ip } = machine;
    (await getLogger()).debug(
      `Sending GET request to ${
        name || hostname || ip
      } endpoint /capabilities/ to get the machines capabilities.`
    );
    const capabilities = await capabilitiesEndpoint.getCapabilities(machine);
    // TODO: handle capabilities correctly
    const convertedCapabilities = await convertSemanticDescription(capabilities);

    convertedCapabilities.forEach((capability) => {
      const knownCapability = newDiscovered.find(
        (storedCapability) => storedCapability.schema === capability.schema
      );
      if (knownCapability) {
        if (!knownCapability.machineIds.includes(machine.id)) {
          knownCapability.machineIds.push(machine.id);
        }
      } else {
        newDiscovered.push({
          ...capability,
          id: uuid.v4(),
          machineIds: [machine.id],
        });
      }
    });
  } catch (e) {
    (await getLogger()).debug(e);
  }
}

export function getDiscovered() {
  return discovered;
}
