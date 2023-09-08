jest.mock('@proceed/system', () => {
  const data = {
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
  };
  const console = {
    log: jest.fn(),
    constructor: { _setLoggingModule: jest.fn() },
  };
  return {
    data,
    console,
  };
});

jest.mock('../../configuration/configHandler.js', () => ({
  readConfigData: jest.fn(),
  createConfigData: jest.fn(),
}));

const logging = require('../logging.js');
const { data } = require('@proceed/system');
const config = require('../../configuration/configHandler.js');

describe('Logging', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const monitoring = {
    '10_1': '{"msg":"This is a log","level":"info","time":1601294328752,"moduleName":"CORE"}',
    '20_2':
      '{"msg":"This is another log","level":"debug","time":1601294328753,"moduleName":"CORE"}',
  };
  const monitoring_old = {
    '1_1': '{"msg":"This is an old log","level":"info","time":1601294328750,"moduleName":"CORE"}',
    '2_2':
      '{"msg":"This is another old log","level":"info","time":1601294328751,"moduleName":"CORE"}',
  };

  const expectedMonitoringList = [
    { '1_1': JSON.parse(monitoring_old['1_1']) },
    { '2_2': JSON.parse(monitoring_old['2_2']) },
    { '10_1': JSON.parse(monitoring['10_1']) },
    { '20_2': JSON.parse(monitoring['20_2']) },
  ];

  describe('getStandardLogTables', () => {
    beforeEach(() => {
      data.read.mockResolvedValueOnce(monitoring);
    });

    afterEach(() => {
      expect(data.read).toHaveBeenCalledWith('monitoring.json');
      expect(data.read).toHaveBeenCalledWith('monitoring_old.json');
    });

    it('returns the logs stored in monitoring', async () => {
      expect(await logging.getStandardLogTables()).toStrictEqual([
        { '10_1': JSON.parse(monitoring['10_1']) },
        { '20_2': JSON.parse(monitoring['20_2']) },
      ]);
    });

    it('returns a concatenation of old and current logs if old logs exist', async () => {
      data.read.mockResolvedValueOnce(monitoring_old);
      expect(await logging.getStandardLogTables()).toStrictEqual(expectedMonitoringList);
    });

    it('returns only the last x entries if a limit is given', async () => {
      data.read.mockResolvedValueOnce(monitoring_old);
      // expect to get only the last three entries of the full monitoring list
      expect(await logging.getStandardLogTables(3)).toStrictEqual(expectedMonitoringList.slice(1));
    });
  });

  describe('functions that work on process logs', () => {
    const processInfo = [
      {
        id: 'processId',
        definitionId: 'definitionId',
        tables: 1,
        currentLogs: 3,
        currentTableID: 0,
      },
      {
        id: 'processId2',
        definitionId: 'definitionId2',
        tables: 1,
        currentLogs: 2,
        currentTableID: 0,
      },
    ];

    const process1Logs = {
      '1_0':
        '{"msg":"First process log","instanceId":"processId-1","time":1,"level":"info","moduleName":"CORE"}',
      '2_1':
        '{"msg":"Second process log","instanceId":"processId-1","time":2,"level":"info","moduleName":"CORE"}',
      '4_2':
        '{"msg":"Third process log","instanceId":"processId-2","time":4,"level":"info","moduleName":"CORE"}',
    };

    const expectedProcess1Logs = [
      { '1_0': JSON.parse(process1Logs['1_0']) },
      { '2_1': JSON.parse(process1Logs['2_1']) },
      { '4_2': JSON.parse(process1Logs['4_2']) },
    ];

    const process2Logs = {
      '1_0':
        '{"msg":"First process2 log","instanceId":"processId2-1","time":1,"level":"info","moduleName":"CORE"}',
      '2_1':
        '{"msg":"Second process2 log","instanceId":"processId2-1","time":2,"level":"info","moduleName":"CORE"}',
    };

    const expectedProcess2Logs = [
      { '1_0': JSON.parse(process2Logs['1_0']) },
      { '2_1': JSON.parse(process2Logs['2_1']) },
    ];

    beforeEach(() => {
      config.readConfigData.mockResolvedValue(processInfo);
    });

    afterEach(() => {
      expect(config.readConfigData).toHaveBeenCalled();
    });

    describe('getProcessLogTables', () => {
      it('returns the logs for the process with the given id', async () => {
        data.read.mockResolvedValueOnce(process1Logs);
        expect(await logging.getProcessLogTables('definitionId')).toStrictEqual(
          expectedProcess1Logs,
        );
        expect(data.read).toHaveBeenCalled();
      });

      it('returns only the last x logs if a limit is given', async () => {
        data.read.mockResolvedValueOnce(process1Logs);
        // expect only the last two entries of the process1 logs
        expect(await logging.getProcessLogTables('definitionId', 2)).toStrictEqual(
          expectedProcess1Logs.slice(1),
        );
        expect(data.read).toHaveBeenCalled();
      });

      it('returns an empty array for a definitionId with no matching entry in processLogs', async () => {
        expect(await logging.getProcessLogTables('some id not in processLogs')).toStrictEqual([]);
      });
    });

    describe('getInstanceLogs', () => {
      beforeEach(() => {
        config.readConfigData.mockResolvedValueOnce(processInfo);
      });

      afterEach(() => {
        expect(config.readConfigData).toHaveBeenCalled();
      });
      it('returns logs for the instance with the given id', async () => {
        data.read.mockResolvedValueOnce(process1Logs);
        // expect only the entries that have an instanceId of processId-1
        expect(await logging.getInstanceLogs('definitionId', 'processId-1')).toStrictEqual(
          expectedProcess1Logs.slice(0, 2),
        );
      });

      it('returns only the last x logs if a limit is given', async () => {
        data.read.mockResolvedValueOnce(process1Logs);
        expect(await logging.getInstanceLogs('definitionId', 'processId-1', 1)).toStrictEqual(
          expectedProcess1Logs.slice(1, 2),
        );
      });

      it('returns an empty array if there are no logs for the given instanceId', async () => {
        data.read.mockResolvedValueOnce(process1Logs);
        expect(await logging.getInstanceLogs('definitionId', 'processId-3')).toStrictEqual([]);
      });

      it('returns an empty array if there are no logs for the given processId', async () => {
        data.read.mockResolvedValueOnce(process1Logs);
        expect(await logging.getInstanceLogs('otherId', 'otherId-1')).toStrictEqual([]);
      });
    });

    describe('deleteInstanceLogs', () => {
      it('removes all entries of a specific instance from the logs of a process', async () => {
        data.read.mockResolvedValueOnce(process1Logs);
        await logging.deleteInstanceLogs('definitionId', 'processId-1');
        expect(data.delete).toHaveBeenCalledTimes(2);
        expect(data.delete).toHaveBeenCalledWith('definitionId/0_monitoring_definitionId.json/1_0');
        expect(data.delete).toHaveBeenCalledWith('definitionId/0_monitoring_definitionId.json/2_1');
      });
    });

    describe('getAllLogTables', () => {
      beforeEach(() => {
        data.read.mockResolvedValueOnce(monitoring);
        data.read.mockResolvedValueOnce(monitoring_old);
        data.read.mockResolvedValueOnce(process1Logs);
        data.read.mockResolvedValueOnce(process2Logs);
      });
      it('returns standard logs as well as logs for all processes', async () => {
        expect(await logging.getAllLogTables()).toStrictEqual({
          standard: expectedMonitoringList,
          definitionId: expectedProcess1Logs,
          definitionId2: expectedProcess2Logs,
        });
      });
      it('returns the last x logs of all tablesif a limit of x is given', async () => {
        expect(await logging.getAllLogTables(2)).toStrictEqual({
          standard: expectedMonitoringList.slice(2, 4),
          definitionId: expectedProcess1Logs.slice(1, 3),
          definitionId2: expectedProcess2Logs.slice(0, 2),
        });
      });
    });
  });
});
