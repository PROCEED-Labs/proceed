jest.mock('@proceed/system');
jest.mock('@proceed/distribution');

const {
  forwardProcess,
  forwardInstance,
  getMachineInfo,
  abortInstanceOnNetwork,
} = require('../processForwarding.js');
const system = require('@proceed/system');
const { db, communication } = require('@proceed/distribution');

describe('Test for functions used to send process/instance information to another engine', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    communication.getAvailableMachines.mockReturnValue([]);
  });

  describe('forwardProcess', () => {
    it('sends the definition of a process version to another machine', async () => {
      db.getProcessVersion.mockResolvedValueOnce('BPMN');
      db.getAllUserTasks.mockResolvedValueOnce([]);
      db.getProcessVersionInfo.mockImplementation(async () => ({
        needs: { html: [], imports: [] },
      }));

      await forwardProcess('123.456.78.9', 12345, 'definitionId', 123);

      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process',
        'POST',
        'application/json',
        { bpmn: 'BPMN' },
      );
    });
    it('also sends the required html for all user task of a process version to another machine', async () => {
      db.getProcessVersion.mockResolvedValueOnce('BPMN');
      db.getAllUserTasks.mockResolvedValueOnce(['userTask1', 'userTask2', 'userTask3']);
      db.getProcessVersionInfo.mockImplementation(async () => ({
        needs: { html: ['userTask1', 'userTask3'], imports: [] },
      }));
      db.getHTML.mockImplementation(async (_, fileName) => fileName);

      await forwardProcess('123.456.78.9', 12345, 'definitionId', 123);

      expect(system.network.sendData).toHaveBeenCalledTimes(3);
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process',
        'POST',
        'application/json',
        { bpmn: 'BPMN' },
      );
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process/definitionId/user-tasks/userTask1',
        'PUT',
        'application/json',
        { html: 'userTask1' },
      );
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process/definitionId/user-tasks/userTask3',
        'PUT',
        'application/json',
        { html: 'userTask3' },
      );
    });

    it('will also send the definitions and the user task data of all imported processes to another machine', async () => {
      db.getProcessVersion.mockImplementation(
        async (definitionId, version) => `${definitionId}#${version}`,
      );
      db.getAllUserTasks.mockResolvedValue(['importUserTask1', 'importUserTask2']);
      db.getProcessVersionInfo.mockImplementation(async (definitionId, version) => {
        if (definitionId === 'definitionId') {
          return {
            needs: {
              html: [],
              imports: [
                { definitionId: 'otherDefinitionId', version: 123 },
                { definitionId: 'otherDefinitionId', version: 456 },
              ],
            },
          };
        } else {
          if (version === 123) {
            return { needs: { html: ['importUserTask1'], imports: [] } };
          } else {
            return { needs: { html: ['importUserTask2'], imports: [] } };
          }
        }
      });
      db.getHTML.mockImplementation(async (_, fileName) => fileName);

      await forwardProcess('123.456.78.9', 12345, 'definitionId', 123);

      expect(system.network.sendData).toHaveBeenCalledTimes(5);
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process',
        'POST',
        'application/json',
        { bpmn: 'definitionId#123' },
      );
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process',
        'POST',
        'application/json',
        { bpmn: 'otherDefinitionId#123' },
      );
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process/otherDefinitionId/user-tasks/importUserTask1',
        'PUT',
        'application/json',
        { html: 'importUserTask1' },
      );
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process',
        'POST',
        'application/json',
        { bpmn: 'otherDefinitionId#456' },
      );
      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process/otherDefinitionId/user-tasks/importUserTask2',
        'PUT',
        'application/json',
        { html: 'importUserTask2' },
      );
    });
  });

  describe('forwardInstance', () => {
    it('sends an instance object to another machine', async () => {
      await forwardInstance('123.456.78.9', 12345, 'definitionId', 'instanceId', {
        useful: 'information',
      });

      expect(system.network.sendData).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/process/definitionId/instance/instanceId',
        'PUT',
        'application/json',
        { useful: 'information' },
      );
    });
  });

  describe('getMachineInfo', () => {
    it('requests id, name and hostname information from another machine', async () => {
      system.network.sendRequest.mockResolvedValueOnce({
        body: '{ "name": "someName", "hostname": "someHostname", "id": "someId" }',
      });
      const info = await getMachineInfo('123.456.78.9', 12345);
      expect(info).toStrictEqual({
        name: 'someName',
        hostname: 'someHostname',
        id: 'someId',
      });
      expect(system.network.sendRequest).toHaveBeenCalledTimes(1);
      expect(system.network.sendRequest).toHaveBeenCalledWith(
        '123.456.78.9',
        12345,
        '/machine/id,name,hostname',
      );
    });
  });

  describe('abortInstanceOnNetwork', () => {
    beforeEach(() => {
      communication.getAvailableMachines.mockReturnValue([
        {
          ip: '123.456.0.1',
          port: 12345,
        },
        {
          ip: '123.456.0.2',
          port: 54321,
        },
      ]);
    });
    it('sends an abort signal for a specific instance to all machines in the network', async () => {
      await abortInstanceOnNetwork('definitionId', 'instanceId');

      expect(system.network.sendData).toHaveBeenCalledTimes(2);

      expect(system.network.sendData).toBeCalledWith(
        '123.456.0.1',
        12345,
        '/process/definitionId/instance/instanceId/instanceState',
        'PUT',
        'application/json',
        { instanceState: 'aborted' },
      );

      expect(system.network.sendData).toBeCalledWith(
        '123.456.0.2',
        54321,
        '/process/definitionId/instance/instanceId/instanceState',
        'PUT',
        'application/json',
        { instanceState: 'aborted' },
      );
    });
    it("doesn't throw when an engine that doesn't have the instance responds with a 404 error", async () => {
      system.network.sendData.mockResolvedValueOnce({});
      system.network.sendData.mockRejectedValueOnce(
        new Error("404 Error, engine doesn't know instance"),
      );

      await expect(abortInstanceOnNetwork('definitionId', 'instanceId')).resolves.not.toThrow();
    });
  });
});
