import mockNetworkFactory from '../../../../mocks/network.js';

const mockNetwork = mockNetworkFactory(jest);

let mockResponse;

mockNetwork.sendRequest.mockImplementation(() =>
  Promise.resolve({ body: JSON.stringify(mockResponse) })
);

mockNetwork.sendData.mockImplementation(() =>
  Promise.resolve({ body: JSON.stringify(mockResponse) })
);

let RequestFuncs;
describe('Communication with /process/** endpoints', () => {
  beforeAll(async () => {
    RequestFuncs = await import(
      '@/frontend/../backend/shared-electron-server/network/ms-engine-communication/process.js'
    );
  });

  let mockMachine;
  beforeEach(async () => {
    mockMachine = { ip: '192.168.1.1', port: 33029 };
    mockResponse = { msg: 'Mock Response' };
  });

  describe('getDeployedProcesses', () => {
    it('returns information about all processes deployed on this engine', async () => {
      mockResponse = [
        { definitionId: 'process1', deploymentDate: 1 },
        { definitionId: 'process2', deploymentDate: 2 },
      ];
      expect(await RequestFuncs.getDeployedProcesses(mockMachine)).toEqual(mockResponse);
      expect(mockNetwork.sendRequest).toHaveBeenCalledWith(
        mockMachine.ip,
        mockMachine.port,
        '/process'
      );
    });
  });

  describe('deployProcess', () => {
    it('deploys process with bpmn', async () => {
      await RequestFuncs.deployProcess(mockMachine, 'processBPMN');
      expect(mockNetwork.sendData).toHaveBeenCalledWith(
        mockMachine.ip,
        mockMachine.port,
        '/process',
        'POST',
        'application/json',
        { bpmn: 'processBPMN' }
      );
    });
  });

  describe('deleteDeployment', () => {
    it('removes deployment information for process with given id from engine', async () => {
      await RequestFuncs.removeDeployment(mockMachine, 'processId');
      expect(mockNetwork.sendRequest).toHaveBeenCalledWith(
        mockMachine.ip,
        mockMachine.port,
        '/process/processId/',
        { method: 'DELETE' }
      );
    });
  });

  describe('sendUserTaskHtml', () => {
    it('sends the HTML of a User Task', async () => {
      await RequestFuncs.sendUserTaskHTML(mockMachine, 'processId', 'userTaskId', 'HTML');
      expect(mockNetwork.sendData).toHaveBeenCalledWith(
        mockMachine.ip,
        mockMachine.port,
        '/process/processId/user-tasks/userTaskId',
        'PUT',
        'application/json',
        { html: 'HTML' }
      );
    });
  });

  describe('startProcessInstance', () => {
    it('sends request to start an instance and returns the repsonded instance id', async () => {
      mockResponse = {
        instanceId: 'instanceId',
      };

      expect(await RequestFuncs.startProcessInstance(mockMachine, 'processId', 123, {})).toEqual(
        mockResponse.instanceId
      );
      expect(mockNetwork.sendData).toHaveBeenCalledWith(
        mockMachine.ip,
        mockMachine.port,
        '/process/processId/versions/123/instance',
        'POST',
        'application/json',
        { variables: {} }
      );
    });
  });

  describe('getInstanceInformation', () => {
    it('requests information for a certain instance (status, tokens, ...)', async () => {
      mockResponse = {
        status: 'Running',
        tokens: ['Token1', 'Token2'],
      };

      expect(
        await RequestFuncs.getInstanceInformation(mockMachine, 'processId', 'instanceId')
      ).toEqual(mockResponse);
      expect(mockNetwork.sendRequest).toHaveBeenCalledWith(
        mockMachine.ip,
        mockMachine.port,
        '/process/processId/instance/instanceId'
      );
    });
  });

  describe('stopProcessInstance', () => {
    it('sends request to stop an instance', async () => {
      await RequestFuncs.stopProcessInstance(mockMachine, 'processId', 'instanceId');
      expect(mockNetwork.sendData).toHaveBeenCalledWith(
        mockMachine.ip,
        mockMachine.port,
        '/process/processId/instance/instanceId/instanceState',
        'PUT',
        'application/json',
        { instanceState: 'stopped' }
      );
    });
  });
});
