import networkEx from '@proceed/system';
const { network } = networkEx;
import * as processEndpoint from './process.js';

const statusEndpoint = {
  /**
   * Checks if the given machine is running a reachable proceed engine
   */
  getStatus: async (machine) => {
    const { body } = await network.sendRequest(machine.ip, machine.port, '/status/', true);

    let { running } = JSON.parse(body);

    // for purposes of testing with the RasPi Engines running an older version
    running = running || JSON.parse(body);

    return running;
  },
};

const capabilitiesEndpoint = {
  /**
   * Request list with all capabilities of the machine
   */
  getCapabilities: async (machine) => {
    const { body } = await network.sendRequest(machine.ip, machine.port, '/capabilities/');

    let capabilities;
    try {
      capabilities = JSON.parse(body);
    } catch (err) {
      capabilities = [];
    }

    return capabilities;
  },
};

const machineEndpoint = {
  /**
   * Requests information about all specified properties of the machine or of all properties if none are specified
   */
  getProperties: async (machine, properties) => {
    let fullRequest = '/machine/';

    if (properties) {
      fullRequest = properties.reduce(
        (request, property) => `${request},${property}`,
        `${fullRequest}${properties.shift()}`,
      );
    }

    const { body } = await network.sendRequest(machine.ip, machine.port, fullRequest);

    return JSON.parse(body);
  },
};

const configurationEndpoint = {
  getConfiguration: async (machine) => {
    const { body } = await network.sendRequest(machine.ip, machine.port, '/configuration');

    return JSON.parse(body);
  },

  sendConfiguration: async (machine, configuration) => {
    await network.sendData(
      machine.ip,
      machine.port,
      '/configuration/',
      'PUT',
      'application/json',
      configuration,
    );
  },

  getDescription: async (machine) => {
    const { body } = await network.sendRequest(
      machine.ip,
      machine.port,
      '/configuration/description',
    );

    return JSON.parse(body).description;
  },
};

const loggingEndpoint = {
  getLogs: async (machine) => {
    const { body } = await network.sendRequest(machine.ip, machine.port, '/logging');

    return JSON.parse(body);
  },
};

const _5thIndustryEndpoint = {
  send5thIndustryServiceAccountData: async (machine, serviceAccountData) => {
    await network.sendData(
      machine.ip,
      machine.port,
      `/5thIndustry/service-account`,
      'PUT',
      'application/json',
      serviceAccountData,
    );
  },
  send5thIndustryAuthorization: async (machine, authorization) => {
    await network.sendData(
      machine.ip,
      machine.port,
      `/5thIndustry/authorization`,
      'PUT',
      'application/json',
      { authorization },
    );
  },
};

export {
  processEndpoint,
  statusEndpoint,
  capabilitiesEndpoint,
  machineEndpoint,
  configurationEndpoint,
  loggingEndpoint,
  _5thIndustryEndpoint,
};
