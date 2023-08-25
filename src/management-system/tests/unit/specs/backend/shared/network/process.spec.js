import fs from 'fs';
import path from 'path';

import mockNetworkFactory from '../../../../../mocks/network.js';

import { convertToEditableBpmn } from '@/shared-frontend-backend/helpers/processVersioning.js';

jest.mock('@proceed/machine', () => ({
  logging: {
    getLogger: () => ({
      debug: jest.fn(),
      info: jest.fn(),
    }),
  },
}));

jest.mock('@/backend/shared-electron-server/data/config.js', () => ({}));

jest.doMock('@/backend/shared-electron-server/network/5thIndustry/5thIndustry.js', () => ({
  get5thIndustryAuthorization: jest.fn(),
  getInspectionPlans: jest.fn(),
  getInspectionPlanData: jest.fn(),
  createPlan: jest.fn(),
  start5thIndustryPlan: jest.fn(),
  stop5thIndustryPlan: jest.fn(),
}));

jest.mock('@/frontend/../backend/shared-electron-server/logging.js', () => ({
  log: jest.fn(),
  debug: jest.fn(),
}));

let mockMachines = [];
jest.doMock('@/frontend/../backend/shared-electron-server/data/machines.js', () => ({
  getMachines: () => mockMachines,
}));

let mockDeployments = {};
jest.doMock('@/backend/shared-electron-server/data/deployment.js', () => ({
  getDeployments: () => mockDeployments,
  removeDeployment: jest.fn(),
}));

let mockMetaObjects = {};
let mockProcesses = [];
let mockBPMN;
let mockUserTasks = [];
let mockImages = {};
let mockHTMLMapping = {};
jest.doMock('@/frontend/../backend/shared-electron-server/data/process.js', () => ({
  addProcess: jest.fn(),
  addProcessVersion: jest.fn(),
  saveProcessUserTask: jest.fn(),
  saveProcessImage: jest.fn(),
  processMetaObjects: mockMetaObjects,
  getProcesses: () => mockProcesses,
  getProcessVersionBpmn: () => mockBPMN,
  updateProcess: jest.fn(),
  getProcessUserTasks: jest.fn().mockResolvedValue(mockUserTasks),
  getProcessImages: jest.fn().mockResolvedValue(mockImages),
  getProcessUserTasksHtml: () => mockHTMLMapping,
  getProcessImages: () => [],
}));

jest.doMock('@/frontend/../backend/shared-electron-server/data/fileHandling.js', () => ({
  getProcessFolder: (id, name) => {
    return `${id}`;
  },
  saveProcess: () => {},
}));

const mockFindOptimalExternalMachine = jest.fn();
jest.doMock('@proceed/decider', () => ({
  findOptimalExternalMachine: mockFindOptimalExternalMachine,
}));

const staticDeployIdXml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../data/bpmn/staticDeployWithIdBPMN.xml'),
  'utf8',
);
const staticDeployAddXml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../data/bpmn/staticDeployWithAddBPMN.xml'),
  'utf8',
);
const machineMappingXml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../data/bpmn/machineMappingBPMN.xml'),
  'utf8',
);
const dynamicDeployXml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../data/bpmn/dynamicDeploy.xml'),
  'utf8',
);
const versionedWithUserTaskXml = fs.readFileSync(
  path.resolve(__dirname, '../../../../../data/bpmn/versionedWithUserTask.xml'),
  'utf8',
);

const mockNetwork = mockNetworkFactory(jest);
mockNetwork.sendRequest.mockImplementation(() => Promise.resolve({ body: '{}' }));

mockNetwork.sendData.mockImplementation(() => Promise.resolve({ body: '{}' }));

let deployment, instance, processStore;
describe('Backend deployment functions', () => {
  beforeAll(async () => {
    deployment = await import(
      '@/frontend/../backend/shared-electron-server/network/process/deployment.js'
    );
    instance = await import(
      '@/frontend/../backend/shared-electron-server/network/process/instance.js'
    );
    processStore = await import('@/backend/shared-electron-server/data/process.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockMachines = [
      {
        id: 'abc123',
        ip: '192.168.1.1',
        port: '33029',
        status: 'CONNECTED',
      },
    ];

    Object.keys(mockMetaObjects).forEach((key) => delete mockMetaObjects[key]);
    mockUserTasks.splice(0, mockUserTasks.length);
    Object.keys(mockImages).forEach((key) => delete mockImages[key]);

    mockDeployments = {
      process1: {
        definitionId: 'process1',
        machines: [
          {
            id: 'abc123',
            ip: '192.168.1.1',
            port: '33029',
            status: 'CONNECTED',
          },
        ],
        instances: {
          1: { id: '1', status: 'Running', stillBeingExecutedOnMachines: { abc123: true } },
          2: { id: '2', status: 'Running', stillBeingExecutedOnMachines: { abc123: true } },
        },
        versions: [
          { version: 123, machines: [{ machineId: 'abc123', needs: { html: [], imports: [] } }] },
        ],
      },
    };
  });

  describe('removeDeployment', () => {
    it('sends request to remove deployment of a process from all machines the process is deployed on', async () => {
      mockMachines = mockMachines.concat([
        {
          id: 'def456',
          ip: '192.168.1.2',
          port: '33021',
          status: 'CONNECTED',
        },
        {
          id: 'ghi789',
          ip: '192.168.1.3',
          port: '33022',
          status: 'CONNECTED',
        },
      ]);

      mockDeployments['process1'].machines.push({
        id: 'def456',
        ip: '192.168.1.2',
        port: '33021',
        status: 'CONNECTED',
      });

      mockDeployments['process1'].instances[1].stillBeingExecutedOnMachines['def456'] = true;
      mockDeployments['process1'].instances[2].stillBeingExecutedOnMachines['def456'] = true;

      await deployment.removeDeployment('process1');

      expect(mockNetwork.sendRequest).toHaveBeenCalledTimes(2);
      expect(mockNetwork.sendRequest).toHaveBeenCalledWith(
        mockDeployments['process1'].machines[0].ip,
        mockDeployments['process1'].machines[0].port,
        '/process/process1/',
        { method: 'DELETE' },
      );
      expect(mockNetwork.sendRequest).toHaveBeenCalledWith(
        mockDeployments['process1'].machines[1].ip,
        mockDeployments['process1'].machines[1].port,
        '/process/process1/',
        { method: 'DELETE' },
      );
    });
  });

  describe('startInstance', () => {
    beforeEach(async () => {
      mockMachines.push({
        id: 'def456',
        ip: '192.168.2.1',
        port: '33029',
        status: 'CONNECTED',
      });

      mockDeployments['process1'].machines.push({
        id: 'def456',
        ip: '192.168.2.1',
        port: '33029',
        status: 'CONNECTED',
      });

      mockDeployments['process1'].versions[0].deploymentMethod = 'static';
      mockDeployments['process1'].versions[0].bpmn = staticDeployIdXml;
    });
    it('starts an instance on the device mapped to the startProcess machineId in case of static deployment', async () => {
      await instance.startInstance('process1', 123);

      expect(mockNetwork.sendData).toHaveBeenCalledWith(
        mockDeployments['process1'].machines[0].ip,
        mockDeployments['process1'].machines[0].port,
        '/process/process1/versions/123/instance',
        'POST',
        'application/json',
        { variables: {} },
      );
    });
    it('starts an instance on the device mapped to the startProcess machineAddress in case of static deployment', async () => {
      mockDeployments['process1'].versions[0].bpmn = staticDeployAddXml;
      await instance.startInstance('process1', 123);

      expect(mockNetwork.sendData).toHaveBeenCalledWith(
        '192.168.1.1',
        '44444',
        '/process/process1/versions/123/instance',
        'POST',
        'application/json',
        { variables: {} },
      );
    });
    it('throws when sending fails', async () => {
      mockNetwork.sendData.mockRejectedValueOnce('TEST ERROR');

      await expect(instance.startInstance('process1', 123)).rejects.toBe('TEST ERROR');
    });
  });
  describe('deployProcessVersion', () => {
    beforeEach(() => {
      mockMachines.push({
        id: 'def456',
        ip: '192.168.2.1',
        port: '33029',
        status: 'CONNECTED',
      });

      mockDeployments['process1'].machines.push({
        id: 'def456',
        ip: '192.168.2.1',
        port: '33029',
        status: 'CONNECTED',
      });

      mockProcesses = [
        {
          id: 'xyz789',
          name: 'Test',
          processConstraints: {
            hardConstraints: [],
            softConstraints: [],
          },
          taskConstraintMapping: {},
          versions: [{ version: 123 }],
        },
      ];
    });
    describe('static', () => {
      beforeAll(() => {
        mockBPMN = machineMappingXml;
        mockHTMLMapping = { Task1: 'HTML' };
      });
      it('statically deploys process to all machines that were mapped to FlowNodes', async () => {
        await deployment.deployProcessVersion('xyz789', 123);
        expect(mockNetwork.sendData).toHaveBeenCalledWith(
          mockDeployments['process1'].machines[0].ip,
          mockDeployments['process1'].machines[0].port,
          '/process',
          'POST',
          'application/json',
          { bpmn: expect.any(String) },
        );
        expect(mockNetwork.sendData).toHaveBeenCalledWith(
          '123.456.7.8',
          12345,
          '/process',
          'POST',
          'application/json',
          { bpmn: expect.any(String) },
        );
      });
      // it('reverts all succesful deployments if deploying to one machine fails and throws', async () => {
      //   mockNetwork.sendData.mockResolvedValueOnce('');
      //   mockNetwork.sendData.mockRejectedValueOnce('');

      //   await expect(backend.deployProcessVersion('xyz789', 123, false)).rejects.toEqual(
      //     new Error('check if all machines are available!')
      //   );

      //   expect(mockNetwork.sendRequest).toHaveBeenCalledTimes(1);
      //   expect(mockNetwork.sendRequest).toHaveBeenCalledWith(
      //     mockMachines[0].ip,
      //     mockMachines[0].port,
      //     '/process/xyz789/',
      //     { method: 'DELETE' }
      //   );
      // });
      it('sends user task to machine where user task is mapped to', async () => {
        mockHTMLMapping = {
          Task1: 'TEST HTML',
        };

        await deployment.deployProcessVersion('xyz789', 123);

        expect(mockNetwork.sendData).toHaveBeenCalledWith(
          mockDeployments['process1'].machines[0].ip,
          mockDeployments['process1'].machines[0].port,
          '/process/xyz789/user-tasks/Task1',
          'PUT',
          'application/json',
          { html: 'TEST HTML' },
        );
      });
    });

    describe('dynamic', () => {
      beforeAll(() => {
        mockBPMN = dynamicDeployXml;
      });
      beforeEach(() => {
        mockFindOptimalExternalMachine.mockResolvedValueOnce({
          engineList: [mockDeployments['process1'].machines[0]],
        });
      });
      it('finds ids for all startEvents in process to deploy', async () => {
        await deployment.deployProcessVersion('xyz789', 123);

        expect(mockFindOptimalExternalMachine).toHaveBeenCalledWith(
          {
            id: mockProcesses[0].id,
            nextFlowNode: 'StartEvent_1',
          },
          { hardConstraints: [], softConstraints: [] },
          mockProcesses[0].processConstraints,
          mockDeployments['process1'].machines.filter((machine) => !machine.discovered),
        );
        expect(mockNetwork.sendData).toHaveBeenCalledWith(
          mockDeployments['process1'].machines[0].ip,
          mockDeployments['process1'].machines[0].port,
          '/process',
          'POST',
          'application/json',
          { bpmn: expect.any(String) },
        );
      });
      it('sends user task to startMachine', async () => {
        mockHTMLMapping = {
          Task1: 'TEST HTML',
        };

        await deployment.deployProcessVersion('xyz789', 123);

        expect(mockNetwork.sendData).toHaveBeenCalledWith(
          mockDeployments['process1'].machines[0].ip,
          mockDeployments['process1'].machines[0].port,
          '/process/xyz789/user-tasks/Task1',
          'PUT',
          'application/json',
          { html: 'TEST HTML' },
        );
      });
    });
  });
  describe('importProcess', () => {
    beforeEach(() => {
      mockDeployments = {
        process1: {
          definitionId: 'process1',
          machines: [
            {
              id: 'abc123',
              ip: '192.168.1.1',
              port: '33029',
              status: 'CONNECTED',
            },
          ],
          instances: {},
          versions: [
            {
              bpmn: dynamicDeployXml,
              version: 123,
              machines: [{ machineId: 'abc123', needs: { html: [], imports: [], images: [] } }],
            },
          ],
        },
      };
    });

    it('will throw on unknown deployment', async () => {
      await expect(deployment.importProcess('unknown')).rejects.toThrow();
    });

    it('will add a process and all known deployed versions to the ms', async () => {
      await deployment.importProcess('process1');

      expect(processStore.addProcess).toBeCalledTimes(1);
      expect(processStore.addProcess).toHaveBeenCalledWith({
        bpmn: (await convertToEditableBpmn(dynamicDeployXml)).bpmn,
      });
      expect(processStore.addProcessVersion).toBeCalledTimes(1);
      expect(processStore.addProcessVersion).toHaveBeenCalledWith('process1', dynamicDeployXml);
    });

    it('will add the newest version of a process as the editable version', async () => {
      mockDeployments = {
        process1: {
          definitionId: 'process1',
          machines: [
            {
              id: 'abc123',
              ip: '192.168.1.1',
              port: '33029',
              status: 'CONNECTED',
            },
          ],
          instances: {},
          versions: [
            {
              bpmn: staticDeployAddXml,
              version: 456,
              machines: [{ machineId: 'abc123', needs: { html: [], imports: [], images: [] } }],
            },
            {
              bpmn: dynamicDeployXml,
              version: 123,
              machines: [{ machineId: 'abc123', needs: { html: [], imports: [], images: [] } }],
            },
            {
              bpmn: machineMappingXml,
              version: 789,
              machines: [{ machineId: 'abc123', needs: { html: [], imports: [], images: [] } }],
            },
          ],
        },
      };

      await deployment.importProcess('process1');

      expect(processStore.addProcess).toBeCalledTimes(1);
      expect(processStore.addProcess).toHaveBeenCalledWith({
        bpmn: (await convertToEditableBpmn(machineMappingXml)).bpmn,
      });
      expect(processStore.addProcessVersion).toBeCalledTimes(3);
    });

    it('will only add the unknown versions if the process is already known', async () => {
      mockDeployments = {
        process1: {
          definitionId: 'process1',
          machines: [
            {
              id: 'abc123',
              ip: '192.168.1.1',
              port: '33029',
              status: 'CONNECTED',
            },
          ],
          instances: {},
          versions: [
            {
              bpmn: staticDeployAddXml,
              version: 456,
              machines: [{ machineId: 'abc123', needs: { html: [], imports: [], images: [] } }],
            },
            {
              bpmn: dynamicDeployXml,
              version: 123,
              machines: [{ machineId: 'abc123', needs: { html: [], imports: [], images: [] } }],
            },
            {
              bpmn: machineMappingXml,
              version: 789,
              machines: [{ machineId: 'abc123', needs: { html: [], imports: [], images: [] } }],
            },
          ],
        },
      };

      mockMetaObjects['process1'] = {
        versions: [
          {
            version: 123,
          },
        ],
      };

      await deployment.importProcess('process1');

      expect(processStore.addProcess).toBeCalledTimes(0);
      expect(processStore.addProcessVersion).toBeCalledTimes(2);
      expect(processStore.addProcessVersion).toHaveBeenCalledWith('process1', staticDeployAddXml);
      expect(processStore.addProcessVersion).toHaveBeenCalledWith('process1', machineMappingXml);
    });

    it('will throw if a deployment version depends on a user task that cannot be gotten from any engine', async () => {
      mockDeployments = {
        process1: {
          definitionId: 'process1',
          machines: [
            {
              id: 'abc123',
              ip: '192.168.1.1',
              port: '33029',
              status: 'CONNECTED',
            },
          ],
          instances: {},
          versions: [
            {
              bpmn: dynamicDeployXml,
              version: 123,
              machines: [
                { machineId: 'abc123', needs: { html: ['userTask1'], imports: [], images: [] } },
                { machineId: 'abc456', needs: { html: ['userTask1'], imports: [], images: [] } },
              ],
            },
          ],
        },
      };

      mockNetwork.sendRequest.mockRejectedValueOnce('ERROR');

      await expect(deployment.importProcess('process1')).rejects.toThrow();
    });

    it('will add the user task alongside the other data if it succesfully retrieved from one engine', async () => {
      mockDeployments = {
        '_42e3d9a9-76e4-4bc1-ab04-011ea05e2341': {
          definitionId: '_42e3d9a9-76e4-4bc1-ab04-011ea05e2341',
          machines: [
            {
              id: 'abc123',
              ip: '192.168.1.1',
              port: '33029',
              status: 'CONNECTED',
            },
            {
              id: 'abc456',
              ip: '192.168.1.2',
              port: '33029',
              status: 'CONNECTED',
            },
          ],
          instances: {},
          versions: [
            {
              bpmn: versionedWithUserTaskXml,
              version: 1671114317064,
              machines: [
                {
                  machineId: 'abc123',
                  needs: { html: ['User_Task_08ikh3c-1671114317064'], imports: [], images: [] },
                },
                {
                  machineId: 'abc456',
                  needs: { html: ['User_Task_08ikh3c-1671114317064'], imports: [], images: [] },
                },
              ],
            },
          ],
        },
      };

      mockNetwork.sendRequest.mockImplementation(async (ip, port, request) => {
        if (ip === '192.168.1.1') {
          throw new Error();
        } else {
          return { body: 'HTML' };
        }
      });

      await deployment.importProcess('_42e3d9a9-76e4-4bc1-ab04-011ea05e2341');

      expect(processStore.addProcess).toBeCalledTimes(1);
      expect(processStore.addProcessVersion).toBeCalledTimes(1);
      expect(processStore.saveProcessUserTask).toBeCalledTimes(2);
      // the user task will be added twice (once unversioned when a new editable version is created and once versioned)
      expect(processStore.saveProcessUserTask).toHaveBeenCalledWith(
        '_42e3d9a9-76e4-4bc1-ab04-011ea05e2341',
        'User_Task_08ikh3c',
        'HTML',
      );
      expect(processStore.saveProcessUserTask).toHaveBeenCalledWith(
        '_42e3d9a9-76e4-4bc1-ab04-011ea05e2341',
        'User_Task_08ikh3c-1671114317064',
        'HTML',
      );
    });

    it('will throw if a deployment version depends on an image that cannot be gotten from any engine', async () => {
      mockDeployments = {
        process1: {
          definitionId: 'process1',
          machines: [
            {
              id: 'abc123',
              ip: '192.168.1.1',
              port: '33029',
              status: 'CONNECTED',
            },
            {
              id: 'cde456',
              ip: '192.168.1.2',
              port: '33029',
              status: 'CONNECTED',
            },
          ],
          instances: {},
          versions: [
            {
              bpmn: dynamicDeployXml,
              version: 123,
              machines: [
                { machineId: 'abc123', needs: { html: [], imports: [], images: ['image.png'] } },
                { machineId: 'cde456', needs: { html: [], imports: [], images: ['image.png'] } },
              ],
            },
          ],
        },
      };

      mockNetwork.sendRequest.mockRejectedValueOnce('ERROR');
      mockNetwork.sendRequest.mockRejectedValueOnce('ERROR');

      await expect(deployment.importProcess('process1')).rejects.toThrow();
    });
  });
  // describe('stopInstance', () => {
  //   it('sends request to stop an instance with a specific id', async () => {
  //     const { id } = mockMachines[0];

  //     await backend.stopInstance('process1', '1');

  //     expect(mockNetwork.sendData).toHaveBeenCalledWith(
  //       mockMachines[0].ip,
  //       mockMachines[0].port,
  //       '/process/process1/instance/1/status',
  //       'PUT',
  //       'application/json',
  //       { status: 'Ended' }
  //     );
  //   });
  //});
});
