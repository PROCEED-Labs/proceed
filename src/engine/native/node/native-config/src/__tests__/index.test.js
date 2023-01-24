jest.mock('fs');
jest.mock('systeminformation');

const NativeConfig = require('../index');
const defaultConfig = require('../config_default.json');
const fs = require('fs');
const path = require('path');
const { graphics } = require('systeminformation');

// mocking the value that is returned when the module tries to read the config from the filesystem
fs.readFileSync.mockReturnValue('{}');
fs.writeFile.mockImplementation((_1, _2, cb) => {
  cb();
});
// mock for check if the device has a display and can thus display user tasks
graphics.mockResolvedValue({
  displays: [],
});

describe('Native-Config', () => {
  beforeEach(() => {
    fs.readFileSync.mockClear();
    fs.writeFile.mockClear();
    graphics.mockClear();
  });

  describe('#constructor', () => {
    it('sets the command property', () => {
      const nConf = new NativeConfig();
      expect(nConf.commands).toStrictEqual(['read_config', 'write_config']);
    });
    it('can be given path where user config is stored', async () => {
      const nConf = new NativeConfig({ dir: 'test/path' });
      await nConf.config;
      const expectedPath = path.join('test', 'path', 'config.json');
      expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
    });
    it('merges a the default config with the user provided config', async () => {
      fs.readFileSync.mockReturnValueOnce('{ "name": "TestName" }');
      const nConf = new NativeConfig();
      expect(await nConf.config).toStrictEqual({ ...defaultConfig, name: 'TestName' });
    });
  });

  describe('getConfig', () => {
    it('returns the current configuration state', async () => {
      fs.readFileSync.mockReturnValueOnce('{ "name": "TestName" }');
      const nConf = new NativeConfig();
      expect(await nConf.getConfig()).toStrictEqual([{ ...defaultConfig, name: 'TestName' }]);
    });
  });

  describe('writeConfig', () => {
    let nConf;
    beforeEach(async () => {
      nConf = new NativeConfig();
      await nConf.config;
    });

    it('updates the config with a new value', async () => {
      await nConf.writeConfig([{ name: 'TestName' }]);
      expect(await nConf.config).toStrictEqual({ ...defaultConfig, name: 'TestName' });
    });

    it('can update multiple config values', async () => {
      await nConf.writeConfig([{ name: 'TestName', description: 'TestDescription' }]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        name: 'TestName',
        description: 'TestDescription',
      });
    });

    it('can update specific values inside of nested objects', async () => {
      await nConf.writeConfig([{ logs: { enabled: false } }]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        logs: { ...defaultConfig.logs, enabled: false },
      });
    });

    it('can update config array values', async () => {
      await nConf.writeConfig([{ machine: { outputs: ['screen'] } }]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        machine: { ...defaultConfig.machine, outputs: ['screen'] },
      });

      await nConf.writeConfig([{ machine: { onlineCheckingAddresses: ['www.google.com'] } }]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        machine: {
          ...defaultConfig.machine,
          outputs: ['screen'],
          onlineCheckingAddresses: ['www.google.com'],
        },
      });
    });

    it("doesn't overwrite previous changes if not specifically requested", async () => {
      await nConf.writeConfig([{ logs: { enabled: false } }]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        logs: { ...defaultConfig.logs, enabled: false },
      });
      await nConf.writeConfig([{ logs: { logLevel: 'trace' } }]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        logs: { ...defaultConfig.logs, enabled: false, logLevel: 'trace' },
      });
    });

    it('overwrites previous changes if overwrite flag is set', async () => {
      await nConf.writeConfig([{ logs: { enabled: false } }]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        logs: { ...defaultConfig.logs, enabled: false },
      });
      await nConf.writeConfig([{ logs: { logLevel: 'trace' } }, true]);
      expect(await nConf.config).toStrictEqual({
        ...defaultConfig,
        logs: { ...defaultConfig.logs, logLevel: 'trace' },
      });
    });

    it('writes changed values to config file', async () => {
      await nConf.writeConfig([{ name: 'Test' }]);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        `{
  "name": "Test"
}`,
        expect.any(Function)
      );

      await nConf.writeConfig([{ logs: { enabled: false } }]);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        `{
  "name": "Test",
  "logs": {
    "enabled": false
  }
}`,
        expect.any(Function)
      );

      await nConf.writeConfig([{ machine: { outputs: ['screen'] } }]);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        `{
  "name": "Test",
  "logs": {
    "enabled": false
  },
  "machine": {
    "outputs": [
      "screen"
    ]
  }
}`,
        expect.any(Function)
      );
    });

    it('only writes values differing from default config to file', async () => {
      await nConf.writeConfig([{ name: '' }]);
      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), '{}', expect.any(Function));

      await nConf.writeConfig([{ logs: { enabled: true } }]);
      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), '{}', expect.any(Function));

      await nConf.writeConfig([{ machine: { classes: [] } }]);
      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), '{}', expect.any(Function));
    });
  });
});
