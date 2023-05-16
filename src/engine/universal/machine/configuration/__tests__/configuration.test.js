jest.mock('@proceed/system', () => {
  let mockConfig = {
    machine: {
      port: 9999,
    },
    logs: {
      enabled: true,
      forwardToConsole: true,
      logLevel: 'info',
      consoleLevel: 'info',
      maxProcessLogEntries: 4,
      maxProcessLogTables: 7,
    },
  };

  const config = {
    getConfig: jest.fn(),
    writeConfig: jest.fn(),
    // used to reset configuration before each test
    resetConfig: () => {
      mockConfig = {
        machine: {
          port: 9999,
        },
        logs: {
          enabled: true,
          forwardToConsole: true,
          logLevel: 'info',
          consoleLevel: 'info',
          maxProcessLogEntries: 4,
          maxProcessLogTables: 7,
        },
      };
    },
    constructor: {
      _setConfigModule: jest.fn(),
    },
  };

  config.getConfig.mockReturnValue(mockConfig);
  config.writeConfig.mockReturnValue(mockConfig);

  const network = {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const data = {
    write: jest.fn(),
    read: jest.fn(),
  };

  return {
    config,
    network,
    data,
  };
});

const system = require('@proceed/system');
const configuration = require('../configHandler');

// TODO: since the native part is mocked (where the writing logic is happening),
// these tests are rendered mostly useless.

describe('Various configuration changes', () => {
  beforeAll(() => {
    configuration.init();
    configuration.start();
  });

  beforeEach(() => {
    system.config.resetConfig();
  });

  it('reading correct configuration key', (done) => {
    configuration.readConfig('logs.logLevel').then((level) => {
      expect(level).toEqual(expect.stringContaining('info'));
      done();
    });
  });

  it('reading configuration key from defaultprofile', (done) => {
    configuration.readConfig('router.reEvaluateTimer').then((reEvaluationTimer) => {
      expect(reEvaluationTimer).toEqual(15000);
      done();
    });
  });

  it('reading non existent configuration key', (done) => {
    configuration.readConfig('eyeColor').then((level) => {
      expect(level).toBeUndefined();
      done();
    });
  });

  it('adding a non existent key', async () => {
    const p = configuration.writeConfigValue('space', 'big');
    await expect(p).rejects.toBeInstanceOf(Error);
    await expect(p).rejects.toHaveProperty('message', 'Key does not exist on config object!');
  });

  // TODO: fails because of object structure

  // it('function executing callbacks called on change', (done) => {
  //   configuration._executeCallbacks = jest.fn();
  //   configuration.writeConfigValue('logs.logLevel', 'info').then(() => {
  //     expect(configuration._executeCallbacks).toHaveBeenCalledWith('logs.logLevel', 'info');
  //     done();
  //   });
  // });
});
