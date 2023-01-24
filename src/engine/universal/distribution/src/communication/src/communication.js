/* eslint-disable no-plusplus */
/* eslint-disable guard-for-in */
const { network, discovery, timer } = require('@proceed/system');
const { config, information } = require('@proceed/machine');

let discoveryInterval = 10000;

/**
 * callbacks that are to be called if a new machine is discovered
 * @callback upCallback
 * @param {Object} newMachine the machine that was newly discovered
 */
const upCallbacks = [];

/**
 * callbacks that are to be called when a discovered service goes down
 * @callback downCallback
 * @param {Object} machine the machine that unpublished its service
 */
const downCallbacks = [];

// stores machines that were not reachable and how many tries failed without a successful connection
const strikeList = {};

/**
 * Sends request to see if a machine is reachable and running an engine
 *
 * @param {Object} machine
 */
async function checkIfAvailable(machine) {
  const { body } = await network.sendRequest(machine.ip, machine.port, '/status', true);

  const { running } = JSON.parse(body);

  return running;
}

// list of discovered machines
const machines = {};

/**
 * Gets some necessary information about the machine
 *
 * @param {Object} machine contains machines network information to make request
 * @returns {Object} - Object containing id, hostname and currentlyConnectedEnvironments
 */
async function getMachineInformation(machine) {
  const { body: machineJSON } = await network.sendRequest(
    machine.ip,
    machine.port,
    '/machine/id,hostname,currentlyConnectedEnvironments'
  );

  return JSON.parse(machineJSON);
}

/**
 * Adds a strike for an unreachable discovered machine and removes it at the third strike
 *
 * @param {Object} machine machine information object
 */
function strikeMachine(machine) {
  if (!strikeList[`${machine.ip}:${machine.port}`]) {
    strikeList[`${machine.ip}:${machine.port}`] = 1;
  } else {
    strikeList[`${machine.ip}:${machine.port}`]++;
    if (strikeList[`${machine.ip}:${machine.port}`] === 3) {
      // remove the unreachable service from the list of services if trying to connect fails three times
      discovery.removeDiscoveredService(machine.ip, machine.port);
      delete strikeList[`${machine.ip}:${machine.port}`];
    }
  }
}

/**
 * Periodically pings discovered machines to ensure that they didn't going offline without signal
 */
async function pingDiscoveredMachines() {
  // check and handle if we are not connected to a network
  const { network: networks } = await information.getMachineInformation(['network']);

  // if there are only virtual networks => assume we are not connected to a network and wait for reconnect
  if (networks.every((network) => network.type === 'virtual')) {
    // cleanup discovered machines list
    Object.values(machines).forEach((machine) => {
      discovery.removeDiscoveredService(machine.ip, machine.port);
    });

    // stop pinging discovered machines and wait for reconnect
    waitForNetworkConnection();
    return;
  }

  await Promise.all(
    Object.values(machines).map(async (machine) => {
      try {
        // check if machine is reachable and running an engine
        const running = await checkIfAvailable(machine);

        if (running) {
          // connection successful and engine running => remove from strikelist if it has strikes
          delete strikeList[`${machine.ip}:${machine.port}`];
          // early return
        }
      } catch (err) {
        // connection not succesful => strike machine and remove it at 3 strikes
        strikeMachine(machine);
      }
    })
  );

  timer.setTimeout(() => {
    pingDiscoveredMachines();
  }, discoveryInterval);
}

/**
 * Periodically checks if there is a network connection and restarts discovery functionality if there is
 */
async function waitForNetworkConnection() {
  // check if the network information in the machines module contains a valid network again
  const { network: networks } = await information.getMachineInformation(['network']);

  // check if there is some non virtual network
  // TODO: discuss if this will always get the wanted result
  if (networks.some((network) => network.type !== 'virtual')) {
    // republish (if it was published) so all machines on the network are able to discover this engine again
    await discovery.resetDiscovery();
    // restart pinging of discovered machines
    pingDiscoveredMachines();
  } else {
    // wait a few seconds and check again
    timer.setTimeout(() => {
      waitForNetworkConnection();
    }, 5000);
  }
}

/**
 * Requests information for given service and adds the publishing machine to the list of known machines
 *
 * @param {Object} service
 */
async function addMachine(service) {
  // make sure we have all necessary information about the machine
  const { id, hostname, currentlyConnectedEnvironments } = await getMachineInformation(service);
  const newMachine = {
    id,
    ip: service.ip,
    port: service.port,
    name: service.name,
    hostname,
    currentlyConnectedEnvironments,
  };
  // store machine
  machines[id] = newMachine;
  // notify subscribed systems about machine being discovered
  upCallbacks.forEach((cb) => cb(newMachine));
}

/**
 * Removes machine which unpublished its service from the list of known machines
 *
 * @param {Object} service
 */
async function removeMachine(service) {
  // make sure machine wasn't removed already to prevent errors
  const machine = Object.values(machines).find(
    (m) => m.ip === service.ip && m.port === service.port
  );

  if (machine) {
    // remove machine from discovered machines list
    delete machines[machine.id];
    // delete from striked machines list
    delete strikeList[`${machine.ip}:${machine.port}`];
    // notify subscribed systems about machine being removed
    downCallbacks.forEach((cb) => cb(machine));
  }
}

/**
 * @memberof module:@proceed/distribution
 *
 * Handles discovery of other machines and exposes functionality for publishing and unpublishing a machine
 */
module.exports = {
  usedMDNSName: null,

  async init() {
    discoveryInterval = 1000 * (await config.readConfig('engine.discoveryInterval'));
    pingDiscoveredMachines();

    // register callback that gets called every time a new machine is discovered
    discovery.onDiscoveredMachine(async (service) => {
      await addMachine(service);
    });
    // register callback that gets called every time a machine is not among the discovered anymore
    discovery.onUndiscoveredMachine(async (service) => {
      await removeMachine(service);
    });

    // pull the discovered machines from the native part once to make sure we get all that were discovered before the callback was registered
    const alreadyKnown = await discovery.discover();
    alreadyKnown.forEach((service) => {
      addMachine(service);
    });
  },

  // Open port and start the advertisement of this engine on the network (e.g.
  // mdns)
  async publish() {
    const name = await config.readConfig('name');
    const port = await config.readConfig('machine.port');
    const { id, hostname } = await information.getMachineInformation(['id', 'hostname']);
    const currentlyConnectedEnvironments = await config.readConfig(
      'machine.currentlyConnectedEnvironments'
    );
    this.usedMDNSName = name || hostname.split('.')[0];

    const txt = {
      id,
      hostname: hostname || '',
      currentlyConnectedEnvironments: JSON.stringify(currentlyConnectedEnvironments || []),
    };

    // Set the port for HTTP
    await network.setPort(port);

    await discovery.publish(this.usedMDNSName, port, txt);
  },

  getAvailableMachines() {
    return Object.values(machines);
  },

  async unpublish() {
    await discovery.unpublish();

    // IMPORTANT: This method is used to ensure that all endpoints are made
    // unreachable in silent mode. By setting the port again at a later point,
    // we can toggle silent mode without having to reset all the endpoints. If
    // we implement additional technologies (like BlueTooth), we have to make
    // sure that a similar method exists (expand the current one / rename).
    await network.unsetPort();
  },

  /**
   * Allows registering a callback that will get called every time a new machine is discovered
   *
   * @param {upCallback} cb the callback that handles the information about the new machine
   */
  onMachineDiscovery(cb) {
    upCallbacks.push(cb);
  },

  /**
   * Allows registering a callback that will get called every time a machine unpublishes its service
   *
   * @param {downCallback} cb the callback that handles the information about a machine unpublishing its service
   */
  onMachineUnpublishing(cb) {
    downCallbacks.push(cb);
  },
};
