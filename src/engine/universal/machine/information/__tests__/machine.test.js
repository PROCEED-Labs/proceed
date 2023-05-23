jest.mock('../../logging/logging', () => ({
  getLogger: jest.fn().mockReturnValue({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
  }),
}));

jest.mock('../../configuration/configHandler', () => {
  const readConfig = jest.fn();

  // different things will be requested by the Machine Information from the Config
  // here we mock the different return values
  readConfig.mockImplementation((parameter) => {
    if (parameter === 'machine.onlineCheckingAddresses') {
      return Promise.resolve(mockConfig['machine']['onlineCheckingAddresses']);
    } else {
      return Promise.resolve(mockConfig[parameter]);
    }
  });

  return { readConfig };
});

jest.mock('@proceed/system', () => {
  const getMachineInfo = jest.fn();
  getMachineInfo.mockImplementation((parameterAsArray) => {
    if (mockDevice[parameterAsArray[0]]) {
      // create correct object like it is returned from the machine module
      // e.g. await machine.getMachineInfo(['os']); {"os":{"platform":"linux","distr...
      return Promise.resolve({ [parameterAsArray[0]]: mockDevice[parameterAsArray[0]] });
    } else {
      // if non-existing, return empty object
      return Promise.resolve({});
    }
  });

  const sendRequest = jest.fn();
  sendRequest.mockResolvedValue('reachable');

  const setTimeout = jest.fn();

  return {
    machine: { getMachineInfo },
    timer: { setTimeout },
    network: { sendRequest },
  };
});

const machineInformation = require('../machineInformation');
const config = require('../../configuration/configHandler');
const { machine } = require('@proceed/system');

// this variable must start with 'mock' so that it gets hoisted by Jest to the top like the other mocking functions
const mockConfig = {
  name: 'testName',
  description: 'little test machine',
  logs: {
    enabled: true,
    logLevel: 'info',
    forwardToConsole: true,
    consoleLevel: 'info',
    maxProcessLogEntries: 500,
    maxProcessLogTables: 5,
    rotationInterval: 600,
    maxStandardLogEntries: 1000,
  },
  processes: {
    acceptUserTasks: false,
    deactivateProcessExecution: false,
  },
  engine: {
    networkRequestTimeout: 10,
    loadInterval: 10,
  },
  machine: {
    port: 33029,
    classes: ['Portable', 'My-Test-Class'],
    domains: ['Kitchen', 'My-Test-Domain'],
    inputs: ['TouchScreen'],
    outputs: ['Speaker'],
    onlineCheckingAddresses: [
      'https://europe-west3-proceed-274611.cloudfunctions.net/online-checking-address',
    ],
    currentlyConnectedEnvironments: [],
  },
};

const mockDevice = {
  hostname: 'my-test-laptop',
  id: 'f0123ff-12ff-0123-fff1-1234567f1234',
  online: true,
  os: { platform: 'linux', distro: 'Ubuntu', release: '20.04.1 LTS' },
  cpu: {
    cores: 8,
    physicalCores: 4,
    processors: 1,
    speed: '1.80',
    currentLoad: 16.11170784103115,
    loadLastMinute: 12.204060589982111,
    loadLastTenMinutes: 9.385136021535363,
    loadLastHalfHour: 10.342676287543954,
    loadLastHour: 10.151967624086414,
    loadLastHalfDay: 10.151967624086414,
    loadLastDay: 10.151967624086414,
  },
  mem: { total: 33423282176, free: 23506612224, used: 9916669952, load: 0.30000000000000004 },
  disk: [
    { type: '', total: 501456297984, free: 192296374272, used: 309159923712 },
    { type: '', total: 535805952, free: 517263360, used: 18542592 },
  ],
  battery: { hasBattery: true, percent: 99, maxCapacity: 47500 },
  display: [
    { currentResX: 1920, currentResY: 1080 },
    { currentResX: 1920, currentResY: 1200 },
  ],
  network: [
    {
      type: 'virtual',
      ip4: '127.0.0.1',
      netmaskv4: '255.0.0.0',
      netmaskv6: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
      ip6: '::1',
      mac: '00:00:00:00:00:00',
    },
  ],
  outputs: ['Screen'],
  inputs: [],
  currentlyConnectedEnvironments: [],
};

describe('Reading Machine information:', () => {
  beforeEach(() => {
    machineInformation._clearCache();
  });

  test('reading a list of two properties which all exist', async () => {
    const info = await machineInformation.getMachineInformation(['name', 'hostname']);
    expect(info).toEqual({
      hostname: mockDevice['hostname'],
      name: mockConfig['name'],
    });
  });

  test('test if "name" is the "hostname", if "name" was not set in the config', async () => {
    // set empty 'name' in config
    // we can do this, because config.readConfig('name') is the first config call in the implementation
    config.readConfig.mockResolvedValueOnce('');
    const info = await machineInformation.getMachineInformation(['name', 'hostname']);
    expect(info).toEqual({
      hostname: mockDevice['hostname'],
      name: mockDevice['hostname'],
    });
  });

  test('get some machine properties, but no config properties', async () => {
    const info = await machineInformation.getMachineInformation(['os', 'disk']);
    expect(info).toEqual({
      os: mockDevice['os'],
      disk: mockDevice['disk'],
    });
  });

  test('get some config properties, but no machine properties', async () => {
    const info = await machineInformation.getMachineInformation([
      'onlineCheckingAddresses',
      'acceptUserTasks',
      'description',
    ]);
    expect(info).toEqual({
      onlineCheckingAddresses: mockConfig['machine']['onlineCheckingAddresses'],
      acceptUserTasks: mockConfig['processes']['acceptUserTasks'],
      description: mockConfig['description'],
    });
  });

  test('check "online" property', async () => {
    const info = await machineInformation.getMachineInformation(['online']);
    expect(info).toEqual({
      online: true,
    });
  });

  test('check that "online" property is false if not remote address is given', async () => {
    // return empty array for machine.onlineCheckingAddresses
    config.readConfig.mockResolvedValueOnce([]);
    const info = await machineInformation.getMachineInformation(['online']);
    expect(info).toEqual({
      online: false,
    });
  });

  test('reading a list of two properties, one of which exists', async () => {
    const info = await machineInformation.getMachineInformation(['nonExistingVar', 'hostname']);
    expect(info).toEqual({
      hostname: mockDevice['hostname'],
      nonExistingVar: undefined,
    });
  });

  test('merging "outputs" and "inputs" from config and machine', async () => {
    const info = await machineInformation.getMachineInformation(['outputs', 'inputs']);
    expect(info).toEqual({
      outputs: mockDevice['outputs'].concat(mockConfig['machine']['outputs']),
      inputs: mockDevice['inputs'].concat(mockConfig['machine']['inputs']),
    });
  });

  test('reading while none of the properties exist', async () => {
    const info = await machineInformation.getMachineInformation([
      'nonExistingVar',
      'nonExistingVar2',
    ]);
    expect(info).toEqual({
      nonExistingVar: undefined,
      nonExistingVar2: undefined,
    });
  });

  test('calculating cpu load', async () => {
    const load = (await machineInformation.getMachineInformation(['cpu'])).cpu.loadLastMinute;
    expect(load).toBeGreaterThanOrEqual(0);
    expect(load).toBeLessThanOrEqual(100);
  });

  test('get all machine values (with config)', async () => {
    const info = await machineInformation.getMachineInformation();

    //should not contain other config properties
    expect(Object.keys(info)).not.toContain('loglevel');
    expect(Object.keys(info)).not.toContain('logs');
    expect(Object.keys(info)).not.toContain('loadInterval');

    // snapshot is automatically created, see here: https://jestjs.io/docs/en/snapshot-testing
    expect(info).toMatchInlineSnapshot(`
      {
        "acceptUserTasks": false,
        "battery": {
          "hasBattery": true,
          "maxCapacity": 47500,
          "percent": 99,
        },
        "classes": [
          "Portable",
          "My-Test-Class",
        ],
        "cpu": {
          "cores": 8,
          "currentLoad": 16.11170784103115,
          "loadLastDay": 0,
          "loadLastHalfDay": 0,
          "loadLastHalfHour": 0,
          "loadLastHour": 0,
          "loadLastMinute": 0,
          "loadLastTenMinutes": 0,
          "physicalCores": 4,
          "processors": 1,
          "speed": "1.80",
        },
        "currentlyConnectedEnvironments": [],
        "deactivateProcessExecution": false,
        "description": "little test machine",
        "disk": [
          {
            "free": 192296374272,
            "total": 501456297984,
            "type": "",
            "used": 309159923712,
          },
          {
            "free": 517263360,
            "total": 535805952,
            "type": "",
            "used": 18542592,
          },
        ],
        "display": [
          {
            "currentResX": 1920,
            "currentResY": 1080,
          },
          {
            "currentResX": 1920,
            "currentResY": 1200,
          },
        ],
        "domains": [
          "Kitchen",
          "My-Test-Domain",
        ],
        "hostname": "my-test-laptop",
        "id": "f0123ff-12ff-0123-fff1-1234567f1234",
        "inputs": [
          "TouchScreen",
        ],
        "mem": {
          "free": 23506612224,
          "load": 0.30000000000000004,
          "total": 33423282176,
          "used": 9916669952,
        },
        "name": "testName",
        "network": [
          {
            "ip4": "127.0.0.1",
            "ip6": "::1",
            "mac": "00:00:00:00:00:00",
            "netmaskv4": "255.0.0.0",
            "netmaskv6": "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
            "type": "virtual",
          },
        ],
        "online": true,
        "onlineCheckingAddresses": [
          "https://europe-west3-proceed-274611.cloudfunctions.net/online-checking-address",
        ],
        "os": {
          "distro": "Ubuntu",
          "platform": "linux",
          "release": "20.04.1 LTS",
        },
        "outputs": [
          "Screen",
          "Speaker",
        ],
        "port": 33029,
      }
    `);
  });
});
