const fs = require('fs');
const path = require('path');
const request = require('supertest')('localhost');
const { startMockEngineProcesses } = require('./startEngines.js');
const { ensureCorrectProceedNamespace } = require('@proceed/bpmn-helper');

jest.setTimeout(200000);

function killEngineProcess(engineProcess) {
  return new Promise((resolve) => {
    const i = Math.random();
    engineProcess.on('exit', () => {
      console.log('engineProcess killed', i);
      resolve();
    });
    engineProcess.on('error', () => {
      console.log('engineProcess error', i);
      resolve();
    });
    console.log('engineProcess kill command', i);
    engineProcess.kill();
  });
}

function getEngines(engineNames) {
  let engineNameList = [];

  if (Array.isArray(engineNames)) {
    engineNameList = engineNames;
  } else {
    engineNameList.push(engineNames);
  }

  return engineNameList.map((name) => engineProcesses.find((engine) => engine.name === name));
}

// send process in the file with the given fileName to the given engines
async function deployProcess(processName, engines) {
  const enginesList = getEngines(engines);

  const bpmn = fs.readFileSync(
    path.resolve(__dirname, 'testProcesses', processName, `${processName}.xml`),
    'utf-8',
  );
  const correctNameSpaceBpmn = ensureCorrectProceedNamespace(bpmn);

  const requests = enginesList.map(async (engine) => {
    return await request.post(`:${engine.port}/process`).send({ bpmn: correctNameSpaceBpmn });
  });
  return await Promise.all(requests);
}

async function deleteProcess(definitionId, engines) {
  const enginesList = getEngines(engines);

  const requests = enginesList.map(async (engine) => {
    return await request.delete(`:${engine.port}/process/${definitionId}`);
  });
  return await Promise.all(requests);
}

async function startInstance(definitionId, version, engineName) {
  const [engine] = getEngines(engineName);

  return (
    await request.post(`:${engine.port}/process/${definitionId}/versions/${version}/instance`)
  ).body.instanceId;
}

async function getInstanceInformation(definitionId, instanceId, engineName) {
  const [engine] = getEngines(engineName);

  return (await request.get(`:${engine.port}/process/${definitionId}/instance/${instanceId}`)).body;
}

let engineProcesses = [];
describe('Test deploying a process', () => {
  beforeAll(async () => {
    engineProcesses = await startMockEngineProcesses(6);
  });

  afterAll(async () => {
    // kills all processes and their subprocesses
    for (engineProcess of engineProcesses) {
      await killEngineProcess(engineProcess.process);
    }
  });

  beforeEach(() => {
    // allows each test to get only the output that occured while running the test
    engineProcesses.forEach((engineProcess) => engineProcess.resetTestOutputStream());
  });

  test('every machine is reachable', async () => {
    const requests = engineProcesses.map(async (engineProcess) => {
      const response = await request.get(`:${engineProcess.port}/machine`);
      return response;
    });

    const answers = await Promise.all(requests);

    answers.forEach((answer) => {
      expect(answer.status).toBe(200);
    });
  });

  describe('deploying and starting a process on a machine', () => {
    describe('checks instance-information after process execution', () => {
      describe('dynamic deployment', () => {
        test('three engines - dynamic HC', async () => {
          // execution order: machine 1 -> machine 3 -> machine 2
          const definitionId = '_09f031e2-b6df-43e0-985e-1cad43473382';

          // filter for engines to be used
          let engineNames = ['machine1', 'machine2', 'machine3'];

          await deployProcess('threeEngineDynamicHC', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 3 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 3000));

          const engineResponses = await Promise.all(
            engineNames.map((engine) =>
              getInstanceInformation(definitionId, instanceId, engine).then((response) => ({
                ...engine,
                response,
              })),
            ),
          );

          // check for instance information
          engineResponses.forEach((engine) => {
            const instanceInfo = engine.response.body;

            if (engine.name === 'machine1') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['FORWARDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'FORWARDED',
                  currentFlowElementId: 'Flow_1rsci5r',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  nextMachine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    port: 33022,
                    name: 'machine3',
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                  },
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1y3m10b',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_1rsci5r',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  nextMachine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                    port: 33022,
                  },
                  progress: { value: 0, manual: false },
                },
              ]);
              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine2') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['ENDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_01l350g',
                  currentFlowNodeState: 'COMPLETED',
                  currentFlowElementStartTime: expect.any(Number),
                  machineHops: 2,
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1y3m10b',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1l0spa8',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    port: 33022,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1hulyn1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_01l350g',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
              ]);
              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine3') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['FORWARDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'FORWARDED',
                  currentFlowElementId: 'Flow_0v67ohp',
                  currentFlowElementStartTime: expect.any(Number),
                  machineHops: 1,
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  nextMachine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    port: 33021,
                    name: 'machine2',
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                  },
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1y3m10b',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1l0spa8',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    port: 33022,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_0v67ohp',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    port: 33022,
                  },
                  nextMachine: {
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  progress: { value: 0, manual: false },
                },
              ]);
              expect(instanceInfo.adaptationLog).toEqual([]);
            }
          });
        });

        test('three engines - dynamic SC', async () => {
          // execution order: machine 1 -> machine 3 -> machine 2
          const definitionId = '_09f031e2-b6df-43e0-985e-1cad43473382';

          // filter for engines to be used
          let engineNames = ['machine1', 'machine2', 'machine3'];

          await deployProcess('threeEngineDynamicHC', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 10 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 10000));

          const engineResponses = await Promise.all(
            engineNames.map((engine) =>
              getInstanceInformation(definitionId, instanceId, engine).then((response) => ({
                ...engine,
                response,
              })),
            ),
          );

          // check for instance information
          engineResponses.forEach((engine) => {
            const instanceInfo = engine.response.body;

            if (engine.name === 'machine1') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['FORWARDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'FORWARDED',
                  currentFlowElementId: 'Flow_1o4ewqd',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  nextMachine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    port: 33022,
                    name: 'machine3',
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                  },
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_00ovd1m',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_1o4ewqd',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  nextMachine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                    port: 33022,
                  },
                  progress: { value: 0, manual: false },
                },
              ]);
              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine2') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['ENDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_18gxr62',
                  currentFlowNodeState: 'COMPLETED',
                  machineHops: 2,
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_00ovd1m',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1j4puwu',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    port: 33022,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0nkqieq',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_18gxr62',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine3') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['FORWARDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'FORWARDED',
                  currentFlowElementId: 'Flow_0cmy65u',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 1,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  nextMachine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    port: 33021,
                    name: 'machine2',
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                  },
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_00ovd1m',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1j4puwu',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    port: 33022,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_0cmy65u',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  executionState: 'FORWARDED',
                  machine: {
                    id: 'machineId3',
                    ip: expect.any(String),
                    name: 'machine3',
                    port: 33022,
                  },
                  nextMachine: {
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: expect.any(Array),
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  progress: { value: 0, manual: false },
                },
              ]);
              expect(instanceInfo.adaptationLog).toEqual([]);
            }
          });
        });

        test('stop Instance due to maxTokenStorageRounds constraint for process', async () => {
          /**
           * Instance is executed by machine 1
           * -> at task Activity_0uqog8n, the decider will stop the instance due to unfulfilled constraints
           * -> other token running in parallel will also be stopped
           */

          const definitionId = '_0d5f722a-b5c7-4c98-8210-18570552d78f';

          // filter for engines to deploy this process to
          let engineNames = ['machine1'];

          await deployProcess('deciderStopInstanceProcess', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 3 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 4000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['ERROR-CONSTRAINT-UNFULFILLED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'ERROR-CONSTRAINT-UNFULFILLED',
              currentFlowElementId: 'Flow_1m9r868',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Gateway_1rj4z55',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 2,
              deciderStorageTime: expect.any(Number),
              intermediateVariablesState: null,
            },
            {
              tokenId: expect.any(String),
              state: 'ERROR-CONSTRAINT-UNFULFILLED',
              currentFlowElementId: 'Activity_066db2t',
              currentFlowElementStartTime: expect.any(Number),
              currentFlowNodeProgress: { value: 0, manual: false },
              previousFlowElementId: 'Flow_1lwdqo3',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 0,
              deciderStorageTime: 0,
              intermediateVariablesState: null,
            },
          ]);
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Gateway_1rj4z55',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Flow_1m9r868',
              executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
              errorMessage: 'Instance stopped execution because of: maxTokenStorageRounds',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_066db2t',
              executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
              errorMessage: 'Instance stopped execution because of: maxTokenStorageRounds',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
              progress: { value: 0, manual: false },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('stop token due to maxTokenStorageRounds constraint for flowNode', async () => {
          /**
           * Instance is executed by 2 engines
           * -> at sequenceFlow Flow_1qga0qa on machine 1, the decider will stop the token due to unfulfilled constraints
           * -> other token running in parallel on machine 2 will not be affected by this
           */
          const definitionId = '_c6b521de-5cf8-4224-8fbf-9d6e32e1e974';

          // filter for engines to deploy this process to
          let engineNames = ['machine1', 'machine2'];

          await deployProcess('deciderStopTokenProcess', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 3 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 3000));

          const engineResponses = await Promise.all(
            engineNames.map((engine) =>
              getInstanceInformation(definitionId, instanceId, engine).then((response) => ({
                ...engine,
                response,
              })),
            ),
          );

          engineResponses.forEach((engine) => {
            const instanceInfo = engine.response.body;

            if (engine.name === 'machine1') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['ERROR-CONSTRAINT-UNFULFILLED', 'ENDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ERROR-CONSTRAINT-UNFULFILLED',
                  currentFlowElementId: 'Flow_1qga0qa',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 2,
                  deciderStorageTime: 2000,
                },
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_125goxg',
                  currentFlowNodeState: 'COMPLETED',
                  currentFlowElementStartTime: expect.any(Number),
                  machineHops: 0,
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Gateway_0t67gjs',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0fxx8a4',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 100, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_125goxg',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_1qga0qa',
                  executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
                  errorMessage: 'Token stopped execution because of: maxTokenStorageRounds',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }
          });
        });

        test('deployment waiting for unfulfilled constraints', async () => {
          /**
           *  Instance will be executed on machine 1 until sequenceFlow Flow_1k0g6oo
           * -> at this sequenceFlow, constraints will be unfulfilled resulting in "reEvaluation rounds"
           * -> instance state is requested while instance is still trying to deploy the next task
           * -> token with state DEPLOYMENT_WAITING and attributes deciderStorageRounds, deciderStorageTime are increased respectively
           */
          const definitionId = '_a0caef92-33de-4305-8359-7b2141612a75';

          // filter for engines to deploy this process to
          let engineNames = ['machine1'];

          await deployProcess('deploymentWaitingProcess', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 3 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 3000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['DEPLOYMENT-WAITING']);
          expect(instanceInfo.tokens).toHaveLength(1);
          const [token] = instanceInfo.tokens;
          expect(token).toStrictEqual({
            tokenId: expect.any(String),
            state: 'DEPLOYMENT-WAITING',
            currentFlowElementId: 'Flow_1k0g6oo',
            currentFlowElementStartTime: expect.any(Number),
            previousFlowElementId: 'Activity_0ngpal8',
            localStartTime: expect.any(Number),
            localExecutionTime: expect.any(Number),
            machineHops: 0,
            deciderStorageRounds: expect.any(Number),
            deciderStorageTime: expect.any(Number),
            intermediateVariablesState: null,
          });
          expect(token.deciderStorageRounds).toBeGreaterThan(0); // decider is re-evaluating due to unfulfilled constraints
          expect(token.deciderStorageTime).toBeGreaterThan(0); // decider is re-evaluating due to unfulfilled constraints

          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_0ngpal8',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('LocalMachineOnly profile config - deployment waiting due to unfulfilled constraints on local engine', async () => {
          /**
           *  Instance will be executed only on machine 4 due to profile config LocalMachineOnly
           * -> at flowNode Event_0uhm40l, constraints are unfulfilled locally
           * -> no further execution, neither locally nor on other engine
           * -> instance state is requested while instance is still trying to deploy the next flowNode
           * -> token with state DEPLOYMENT_WAITING and attributes deciderStorageRounds, deciderStorageTime are increased respectively
           */
          const definitionId = '_a0caef92-33de-4305-8359-7b2141612a75';

          // filter for engines to deploy this process to
          let engineNames = ['machine4'];

          // deploy and start process on machine 4
          await deployProcess('twoEngineDynamicHC', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['DEPLOYMENT-WAITING']);
          expect(instanceInfo.tokens).toHaveLength(1);
          const [token] = instanceInfo.tokens;
          expect(token).toStrictEqual({
            tokenId: expect.any(String),
            state: 'DEPLOYMENT-WAITING',
            currentFlowElementId: 'Flow_1i2xfx7',
            currentFlowElementStartTime: expect.any(Number),
            previousFlowElementId: 'Activity_0ferk46',
            localStartTime: expect.any(Number),
            localExecutionTime: expect.any(Number),
            machineHops: 0,
            deciderStorageRounds: expect.any(Number),
            deciderStorageTime: expect.any(Number),
            intermediateVariablesState: null,
          });
          expect(token.deciderStorageRounds).toBeGreaterThan(0); // decider is re-evaluating due to unfulfilled constraints
          expect(token.deciderStorageTime).toBeGreaterThan(0); // decider is re-evaluating due to unfulfilled constraints

          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_0r3k12t',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_0ferk46',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('PreferLocalMachine profile config - execution only locally until constraints unfulfilled on local engine', async () => {
          /**
           *  Instance will be executed on machine 5 until task Event_0uhm40l
           * -> at this flowNode, constraints are unfulfilled locally
           * -> token will be shifted to machine 1
           */
          const definitionId = '_a0caef92-33de-4305-8359-7b2141612a75';

          // filter for engines to deploy this process to
          let engineNames = ['machine1', 'machine5'];

          // deploy and start process on machine 4
          await deployProcess('twoEngineDynamicHC', engineNames[1]);

          let instanceId = await startInstance(definitionId, 123, engineNames[1]);

          // after starting the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const engineResponses = await Promise.all(
            engineNames.map((engine) =>
              getInstanceInformation(definitionId, instanceId, engine).then((response) => ({
                ...engine,
                response,
              })),
            ),
          );

          engineResponses.forEach((engine) => {
            const instanceInfo = engine.response.body;

            if (engine.name === 'machine1') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['ENDED']);
              expect(instanceInfo.tokens).toHaveLength(1);
              const [token] = instanceInfo.tokens;
              expect(token).toStrictEqual({
                tokenId: expect.any(String),
                state: 'ENDED',
                currentFlowElementId: 'Event_0uhm40l',
                currentFlowNodeState: 'COMPLETED',
                currentFlowElementStartTime: expect.any(Number),
                localStartTime: expect.any(Number),
                localExecutionTime: expect.any(Number),
                machineHops: 1,
                deciderStorageRounds: 0,
                deciderStorageTime: 0,
              });

              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId5',
                    ip: expect.any(String),
                    name: 'machine5',
                    port: 33024,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0r3k12t',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId5',
                    ip: expect.any(String),
                    name: 'machine5',
                    port: 33024,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0ferk46',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId5',
                    ip: expect.any(String),
                    name: 'machine5',
                    port: 33024,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_0uhm40l',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    port: 33020,
                    name: 'machine1',
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine5') {
              expect(engine.response.status).toEqual(200);
              expect(instanceInfo.instanceState).toEqual(['FORWARDED']);
              expect(instanceInfo.tokens).toHaveLength(1);
              const [token] = instanceInfo.tokens;
              expect(token).toStrictEqual({
                tokenId: expect.any(String),
                state: 'FORWARDED',
                currentFlowElementId: 'Flow_1i2xfx7',
                currentFlowElementStartTime: expect.any(Number),
                localStartTime: expect.any(Number),
                localExecutionTime: expect.any(Number),
                machineHops: 0,
                deciderStorageRounds: 0,
                deciderStorageTime: 0,
                nextMachine: {
                  id: 'machineId1',
                  ip: expect.any(String),
                  port: 33020,
                  name: 'machine1',
                  hostname: expect.any(String),
                  currentlyConnectedEnvironments: [],
                },
              });

              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId5',
                    ip: expect.any(String),
                    name: 'machine5',
                    port: 33024,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0r3k12t',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId5',
                    ip: expect.any(String),
                    name: 'machine5',
                    port: 33024,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0ferk46',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId5',
                    ip: expect.any(String),
                    name: 'machine5',
                    port: 33024,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_1i2xfx7',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId5',
                    ip: expect.any(String),
                    name: 'machine5',
                    port: 33024,
                  },
                  nextMachine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    port: 33020,
                    name: 'machine1',
                    hostname: expect.any(String),
                    currentlyConnectedEnvironments: [],
                  },
                  progress: { value: 0, manual: false },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }
          });
        });

        test('maxTimeFlowNode profile config - stop token if time exceed for flowNode', async () => {
          /**
           * on machine 4 the profile config has a maxTimeFlowNode of 1 sec
           * -> task Activity_024hiuu takes above 2 seconds to execute -> profile config unfulfilled
           * -> no further execution for this token, other tokens remain untouched
           */
          const definitionId = '_fdf6c05f-87b8-4085-80da-d1ebdc1b9086';

          // filter for engines to deploy this process to
          let engineNames = ['machine4'];

          // deploy and start process on machine 4
          await deployProcess('parallelScriptTaskDynamicProcess', engineNames[0]);

          let instanceId = await startInstance(definitionId, '123', engineNames[0]);

          // after starting the process, wait 5 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 5000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['READY', 'ERROR-CONSTRAINT-UNFULFILLED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'READY',
              currentFlowElementId: 'Gateway_1br4fav',
              currentFlowElementStartTime: expect.any(Number),
              currentFlowNodeState: 'ACTIVE',
              previousFlowElementId: 'Flow_0knga08',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: expect.any(Number),
              deciderStorageTime: expect.any(Number),
              intermediateVariablesState: {},
            },
            {
              tokenId: expect.any(String),
              state: 'ERROR-CONSTRAINT-UNFULFILLED',
              currentFlowElementId: 'Flow_0ijy7a4',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Activity_024hiuu',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: expect.any(Number),
              deciderStorageTime: expect.any(Number),
              intermediateVariablesState: null,
            },
          ]);

          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Gateway_1qgcro8',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_13f2plc',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_024hiuu',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
              progress: { value: 100, manual: false },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Flow_0ijy7a4',
              executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
              errorMessage: 'Token stopped execution because of: maxTimeFlowNode',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId4',
                ip: expect.any(String),
                name: 'machine4',
                port: 33023,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('maxTimeProcessLocal profile config - stop Instance if time exceed for token', async () => {
          /**
           * on machine 5 the profile config has a maxTimeProcessLocal of 1 sec
           * -> after flowNode Activity_024hiuu the token took above 2 seconds to execute -> profile config unfulfilled
           * -> no further execution of every token on machine 5
           */
          const definitionId = '_fdf6c05f-87b8-4085-80da-d1ebdc1b9086';

          // filter for engines to deploy this process to
          let engineNames = ['machine5'];

          // deploy and start process on machine 4
          await deployProcess('parallelScriptTaskDynamicProcess', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 5 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 5000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['ERROR-CONSTRAINT-UNFULFILLED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'ERROR-CONSTRAINT-UNFULFILLED',
              currentFlowElementId: 'Gateway_1br4fav',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Flow_0knga08',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: expect.any(Number),
              deciderStorageTime: expect.any(Number),
              intermediateVariablesState: null,
            },
            {
              tokenId: expect.any(String),
              state: 'ERROR-CONSTRAINT-UNFULFILLED',
              currentFlowElementId: 'Flow_0ijy7a4',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Activity_024hiuu',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: expect.any(Number),
              deciderStorageTime: expect.any(Number),
              intermediateVariablesState: null,
            },
          ]);

          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId5',
                ip: expect.any(String),
                name: 'machine5',
                port: 33024,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Gateway_1qgcro8',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId5',
                ip: expect.any(String),
                name: 'machine5',
                port: 33024,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_13f2plc',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId5',
                ip: expect.any(String),
                name: 'machine5',
                port: 33024,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_024hiuu',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId5',
                ip: expect.any(String),
                name: 'machine5',
                port: 33024,
              },
              progress: { value: 100, manual: false },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Gateway_1br4fav',
              executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
              errorMessage: 'Instance stopped execution because of: maxTimeProcessLocal',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId5',
                ip: expect.any(String),
                name: 'machine5',
                port: 33024,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Flow_0ijy7a4',
              executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
              errorMessage: 'Instance stopped execution because of: maxTimeProcessLocal',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId5',
                ip: expect.any(String),
                name: 'machine5',
                port: 33024,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('maxTimeProcessGlobal profile config - stop Instance if time exceed for global process', async () => {
          /**
           * on machine 6 the profile config has a maxTimeProcessGlobal of 1 sec
           * -> after task Activity_024hiuu the process in sum took 2 seconds to execute -> profile config unfulfilled
           * -> no further execution of every token
           */
          const definitionId = '_fdf6c05f-87b8-4085-80da-d1ebdc1b9086';

          // filter for engines to deploy this process to
          let engineNames = ['machine6'];

          // deploy and start process on machine 4
          await deployProcess('parallelScriptTaskDynamicProcess', engineNames[0]);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 5 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 5000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['ERROR-CONSTRAINT-UNFULFILLED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'ERROR-CONSTRAINT-UNFULFILLED',
              currentFlowElementId: 'Gateway_1br4fav',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Flow_0knga08',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: expect.any(Number),
              deciderStorageTime: expect.any(Number),
              intermediateVariablesState: null,
            },
            {
              tokenId: expect.any(String),
              state: 'ERROR-CONSTRAINT-UNFULFILLED',
              currentFlowElementId: 'Flow_0ijy7a4',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Activity_024hiuu',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: expect.any(Number),
              deciderStorageTime: expect.any(Number),
              intermediateVariablesState: null,
            },
          ]);

          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId6',
                ip: expect.any(String),
                name: 'machine6',
                port: 33025,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Gateway_1qgcro8',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId6',
                ip: expect.any(String),
                name: 'machine6',
                port: 33025,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_13f2plc',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId6',
                ip: expect.any(String),
                name: 'machine6',
                port: 33025,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_024hiuu',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId6',
                ip: expect.any(String),
                name: 'machine6',
                port: 33025,
              },
              progress: { value: 100, manual: false },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Gateway_1br4fav',
              executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
              errorMessage: 'Instance stopped execution because of: maxTimeProcessGlobal',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId6',
                ip: expect.any(String),
                name: 'machine6',
                port: 33025,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Flow_0ijy7a4',
              executionState: 'ERROR-CONSTRAINT-UNFULFILLED',
              errorMessage: 'Instance stopped execution because of: maxTimeProcessGlobal',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId6',
                ip: expect.any(String),
                name: 'machine6',
                port: 33025,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        describe('external activities', () => {
          const definitionId = '_268b3af3-19bb-4c33-9ad1-eb48cec7b686';
          let instanceId;
          let tokenId;
          let engineName;
          let usedEngine;
          beforeEach(async () => {
            engineName = 'machine1';
            [usedEngine] = getEngines(engineName);

            await deployProcess('externalActivity', engineName);

            await new Promise((resolve) => setTimeout(() => resolve(), 100));

            instanceId = await startInstance(definitionId, 123, engineName);

            // after starting the process, wait 5 seconds before requesting the state of the instance
            await new Promise((resolve) => setTimeout(() => resolve(), 1000));

            const instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);
            expect(instanceInfo.tokens).toEqual([
              {
                tokenId: expect.any(String),
                state: 'RUNNING',
                currentFlowElementId: 'Activity_1w6hbak',
                currentFlowElementStartTime: expect.any(Number),
                currentFlowNodeIsExternal: true,
                currentFlowNodeState: 'READY',
                previousFlowElementId: 'Flow_0gtagl3',
                localStartTime: expect.any(Number),
                localExecutionTime: expect.any(Number),
                machineHops: 0,
                deciderStorageRounds: expect.any(Number),
                deciderStorageTime: expect.any(Number),
                intermediateVariablesState: {},
              },
            ]);

            const [token] = instanceInfo.tokens;
            ({ tokenId } = token);
          });

          test('wrong tokenId will return error', async () => {
            const engineResponse = await request
              .put(
                `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}wrong/currentFlowNodeState`,
              )
              .send({ currentFlowNodeState: 'ACTIVE' });

            expect(engineResponse.status).toEqual(404);
          });

          test('invalid state will return error', async () => {
            const engineResponse = await request
              .put(
                `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}/currentFlowNodeState`,
              )
              .send({ currentFlowNodeState: 'INVALID STATE' });

            expect(engineResponse.status).toEqual(400);
          });

          test('will set the state to EXTERNAL', async () => {
            let engineResponse = await request
              .put(
                `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}/currentFlowNodeState`,
              )
              .send({ currentFlowNodeState: 'EXTERNAL' });

            expect(engineResponse.status).toEqual(200);

            await new Promise((resolve) => setTimeout(() => resolve(), 1000));

            const instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

            expect(instanceInfo.tokens).toEqual([
              {
                tokenId: expect.any(String),
                state: 'RUNNING',
                currentFlowElementId: 'Activity_1w6hbak',
                currentFlowElementStartTime: expect.any(Number),
                currentFlowNodeIsExternal: true,
                currentFlowNodeState: 'EXTERNAL',
                previousFlowElementId: 'Flow_0gtagl3',
                localStartTime: expect.any(Number),
                localExecutionTime: expect.any(Number),
                machineHops: 0,
                deciderStorageRounds: expect.any(Number),
                deciderStorageTime: expect.any(Number),
                intermediateVariablesState: {},
              },
            ]);

            expect(instanceInfo.adaptationLog).toEqual([]);
          });

          test('will complete the flow node and set variables', async () => {
            let engineResponse = await request
              .put(
                `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}/currentFlowNodeState`,
              )
              .send({ currentFlowNodeState: 'EXTERNAL-COMPLETED', variables: { test: 42 } });

            expect(engineResponse.status).toEqual(200);

            await new Promise((resolve) => setTimeout(() => resolve(), 1000));

            const instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

            expect(instanceInfo.tokens).toEqual([
              {
                tokenId: expect.any(String),
                state: 'ENDED',
                currentFlowElementId: 'Event_0fjznao',
                currentFlowElementStartTime: expect.any(Number),
                currentFlowNodeState: 'COMPLETED',
                previousFlowElementId: 'Flow_0nvpccp',
                localStartTime: expect.any(Number),
                localExecutionTime: expect.any(Number),
                machineHops: 0,
                deciderStorageRounds: expect.any(Number),
                deciderStorageTime: expect.any(Number),
                intermediateVariablesState: null,
              },
            ]);

            expect(instanceInfo.variables).toEqual({
              test: {
                value: 42,
                log: [
                  {
                    changedTime: expect.any(Number),
                    changedBy: 'Activity_1w6hbak',
                  },
                ],
              },
            });

            expect(instanceInfo.log).toContainEqual({
              flowElementId: 'Activity_1w6hbak',
              tokenId,
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              external: true,
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            });

            expect(instanceInfo.adaptationLog).toEqual([]);
          });

          test('will terminate the activity and the token that activated it', async () => {
            let engineResponse = await request
              .put(
                `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}/currentFlowNodeState`,
              )
              .send({ currentFlowNodeState: 'EXTERNAL-TERMINATED' });

            expect(engineResponse.status).toEqual(200);

            await new Promise((resolve) => setTimeout(() => resolve(), 1000));

            const instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

            expect(instanceInfo.tokens).toEqual([
              {
                tokenId: expect.any(String),
                state: 'TERMINATED',
                currentFlowElementId: 'Activity_1w6hbak',
                currentFlowElementStartTime: expect.any(Number),
                currentFlowNodeState: 'TERMINATED',
                previousFlowElementId: 'Flow_0gtagl3',
                localStartTime: expect.any(Number),
                localExecutionTime: expect.any(Number),
                machineHops: 0,
                deciderStorageRounds: expect.any(Number),
                deciderStorageTime: expect.any(Number),
                intermediateVariablesState: null,
              },
            ]);

            expect(instanceInfo.log).toContainEqual({
              flowElementId: 'Activity_1w6hbak',
              tokenId,
              executionState: 'TERMINATED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              external: true,
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            });

            expect(instanceInfo.adaptationLog).toEqual([]);
          });

          test('will fail the activity and the token that activated it', async () => {
            let engineResponse = await request
              .put(
                `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}/currentFlowNodeState`,
              )
              .send({ currentFlowNodeState: 'EXTERNAL-FAILED' });

            expect(engineResponse.status).toEqual(200);

            await new Promise((resolve) => setTimeout(() => resolve(), 1000));

            const instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

            expect(instanceInfo.tokens).toEqual([
              {
                tokenId: expect.any(String),
                state: 'FAILED',
                currentFlowElementId: 'Activity_1w6hbak',
                currentFlowElementStartTime: expect.any(Number),
                currentFlowNodeState: 'FAILED',
                previousFlowElementId: 'Flow_0gtagl3',
                localStartTime: expect.any(Number),
                localExecutionTime: expect.any(Number),
                machineHops: 0,
                deciderStorageRounds: expect.any(Number),
                deciderStorageTime: expect.any(Number),
                intermediateVariablesState: null,
              },
            ]);

            expect(instanceInfo.log).toContainEqual({
              flowElementId: 'Activity_1w6hbak',
              tokenId,
              executionState: 'FAILED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              external: true,
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            });

            expect(instanceInfo.adaptationLog).toEqual([]);
          });
        });

        describe('adaptive processes', () => {
          describe('moving tokens', () => {
            const definitionId = '_aef1a356-0d84-4afc-a0f6-c978dea07d96';
            let engineName;
            let usedEngine;
            let instanceId;
            let tokenId;
            beforeEach(async () => {
              engineName = 'machine1';
              [usedEngine] = getEngines(engineName);

              await deployProcess('adaptiveProcess', engineName);

              const userTask1FileName = `User_Task_0dqts41`;
              const userTask1 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'adaptiveProcess',
                  `${userTask1FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask1FileName}`)
                .send({
                  html: userTask1,
                });

              const userTask2FileName = `User_Task_09g3sdq`;
              const userTask2 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'adaptiveProcess',
                  `${userTask2FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask2FileName}`)
                .send({
                  html: userTask2,
                });

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              instanceId = await startInstance(definitionId, 123, engineName);

              // after starting the process, wait 5 seconds before requesting the state of the instance
              await new Promise((resolve) => setTimeout(() => resolve(), 5000));

              // check initial state to be correct
              const instanceInfo = await getInstanceInformation(
                definitionId,
                instanceId,
                engineName,
              );

              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'RUNNING',
                  currentFlowElementId: 'Activity_1xguu75',
                  currentFlowElementStartTime: expect.any(Number),
                  currentFlowNodeState: 'READY',
                  currentFlowNodeProgress: { value: 0, manual: false },
                  previousFlowElementId: 'Flow_1yx1pxq',
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: expect.any(Number),
                  deciderStorageTime: expect.any(Number),
                  intermediateVariablesState: {},
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
              ]);

              const [token] = instanceInfo.tokens;
              ({ tokenId } = token);

              // check initial user task list to be correct
              const engineResponse = await request.get(`:${usedEngine.port}/tasklist/api`);

              expect(engineResponse.body.length).toBe(1);
              expect(engineResponse.body[0]).toEqual({
                id: 'Activity_1xguu75',
                instanceID: instanceId,
                attrs: expect.any(Object),
                priority: 1,
                performers: [],
                progress: 0,
                startTime: expect.any(Number),
                endTime: null,
                state: 'READY',
              });
            });
            afterEach(async () => {
              // stop the instance and remove the deployment
              await request
                .put(
                  `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`,
                )
                .send({ instanceState: 'stopped' });

              await new Promise((resolve) => setTimeout(() => resolve(), 100));

              await deleteProcess(definitionId, engineName);

              await new Promise((resolve) => setTimeout(() => resolve(), 100));
            });
            it('will allow moving a token from a task to another element', async () => {
              // check the state after the move to be correct
              await request
                .put(
                  `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}`,
                )
                .send({ currentFlowElementId: 'Flow_0n4onyv' });

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              const instanceInfo = await getInstanceInformation(
                definitionId,
                instanceId,
                engineName,
              );

              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'RUNNING',
                  currentFlowElementId: 'Activity_1pgsbor',
                  currentFlowElementStartTime: expect.any(Number),
                  currentFlowNodeState: 'READY',
                  currentFlowNodeProgress: { value: 0, manual: false },
                  previousFlowElementId: 'Flow_0n4onyv',
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: expect.any(Number),
                  deciderStorageTime: expect.any(Number),
                  intermediateVariablesState: {},
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([
                {
                  type: 'TOKEN-MOVE',
                  time: expect.any(Number),
                  tokenId,
                  currentFlowElementId: 'Activity_1xguu75',
                  targetFlowElementId: 'Flow_0n4onyv',
                },
              ]);

              // check that the new user task is in the list
              const engineResponse = await request.get(`:${usedEngine.port}/tasklist/api`);

              // contain the new user task and also the user task that was skipped due to token move with status skipped
              expect(engineResponse.body).toEqual([
                {
                  id: 'Activity_1pgsbor',
                  instanceID: instanceId,
                  attrs: expect.any(Object),
                  priority: 1,
                  performers: [],
                  progress: 0,
                  startTime: expect.any(Number),
                  endTime: null,
                  state: 'READY',
                },
                {
                  id: 'Activity_1xguu75',
                  instanceID: instanceId,
                  attrs: expect.any(Object),
                  priority: 1,
                  performers: [],
                  progress: 0,
                  startTime: expect.any(Number),
                  endTime: null,
                  state: 'SKIPPED',
                },
              ]);
            });
            it('will allow removing a token from an instance', async () => {
              // check the state after the removal to be correct
              await request.delete(
                `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}`,
              );

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              const instanceInfo = await getInstanceInformation(
                definitionId,
                instanceId,
                engineName,
              );

              // TODO: check non ended state
              expect(instanceInfo.tokens).toEqual([]);

              expect(instanceInfo.log).toContainEqual({
                flowElementId: 'Activity_1xguu75',
                tokenId,
                executionState: 'SKIPPED',
                startTime: expect.any(Number),
                endTime: expect.any(Number),
                machine: expect.any(Object),
                progress: { value: 0, manual: false },
                milestones: {},
                priority: 1,
                performers: [],
              });

              expect(instanceInfo.adaptationLog).toEqual([
                {
                  type: 'TOKEN-REMOVE',
                  time: expect.any(Number),
                  tokenId,
                  currentFlowElementId: 'Activity_1xguu75',
                },
              ]);

              // check that the user task is skipped in the list
              const engineResponse = await request.get(`:${usedEngine.port}/tasklist/api`);

              expect(engineResponse.body).toEqual([
                {
                  id: 'Activity_1xguu75',
                  instanceID: instanceId,
                  attrs: expect.any(Object),
                  priority: 1,
                  performers: [],
                  progress: 0,
                  startTime: expect.any(Number),
                  endTime: null,
                  state: 'SKIPPED',
                },
              ]);
            });
            // TODO: add Token
          });
          describe('adapting variables', () => {
            const definitionId = '_aef1a356-0d84-4afc-a0f6-c978dea07d96';
            let engineName;
            let usedEngine;
            let instanceId;
            let tokenId;
            beforeEach(async () => {
              engineName = 'machine1';
              [usedEngine] = getEngines(engineName);

              await deployProcess('adaptiveProcess', engineName);

              const userTask1FileName = `User_Task_0dqts41`;
              const userTask1 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'adaptiveProcess',
                  `${userTask1FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask1FileName}`)
                .send({
                  html: userTask1,
                });

              const userTask2FileName = `User_Task_09g3sdq`;
              const userTask2 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'adaptiveProcess',
                  `${userTask2FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask2FileName}`)
                .send({
                  html: userTask2,
                });

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              instanceId = await startInstance(definitionId, 123, engineName);

              // after starting the process, wait 5 seconds before requesting the state of the instance
              await new Promise((resolve) => setTimeout(() => resolve(), 5000));

              // check initial state to be correct
              const instanceInfo = await getInstanceInformation(
                definitionId,
                instanceId,
                engineName,
              );

              expect(instanceInfo.variables).toEqual({});

              const [token] = instanceInfo.tokens;
              ({ tokenId } = token);

              // check initial user task list to be correct
              const engineResponse = await request.get(`:${usedEngine.port}/tasklist/api`);

              expect(engineResponse.body.length).toBe(1);
              expect(engineResponse.body[0]).toEqual({
                id: 'Activity_1xguu75',
                instanceID: instanceId,
                attrs: expect.any(Object),
                priority: 1,
                performers: [],
                progress: 0,
                startTime: expect.any(Number),
                endTime: null,
                state: 'READY',
              });
            });
            afterEach(async () => {
              // stop the instance and remove the deployment
              await request
                .put(
                  `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`,
                )
                .send({ instanceState: 'stopped' });

              await new Promise((resolve) => setTimeout(() => resolve(), 100));

              await deleteProcess(definitionId, engineName);

              await new Promise((resolve) => setTimeout(() => resolve(), 100));
            });
            it('will allow manually changing variables in a running instance', async () => {
              // set an intermediate value for the variable (will be commited to the instance state when the user task is completed)
              await request
                .put(
                  `:${usedEngine.port}/tasklist/api/variable?instanceID=${instanceId}&userTaskID=Activity_1xguu75`,
                )
                .send({ var1: 'some-value' });
              // complete the user task
              await request
                .post(
                  `:${usedEngine.port}/tasklist/api/userTask?instanceID=${instanceId}&userTaskID=Activity_1xguu75`,
                )
                .send();

              await request
                .post(
                  `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/variables`,
                )
                .send({
                  var1: 'some-other-value',
                  var2: 'a-value',
                });

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              const instanceInfo = await getInstanceInformation(
                definitionId,
                instanceId,
                engineName,
              );

              expect(instanceInfo.variables).toEqual({
                var1: {
                  value: 'some-other-value',
                  log: [
                    {
                      changedTime: expect.any(Number),
                      changedBy: 'Activity_1xguu75',
                      oldValue: undefined,
                    },
                    {
                      changedTime: expect.any(Number),
                      changedBy: 'manual',
                      oldValue: 'some-value',
                    },
                  ],
                },
                var2: {
                  value: 'a-value',
                  log: [
                    {
                      changedTime: expect.any(Number),
                      changedBy: 'manual',
                      oldValue: undefined,
                    },
                  ],
                },
              });

              expect(instanceInfo.adaptationLog).toEqual([
                {
                  type: 'VARIABLE-ADAPTATION',
                  time: expect.any(Number),
                  changes: [
                    {
                      variableName: 'var1',
                      oldValue: 'some-value',
                      newValue: 'some-other-value',
                    },
                    {
                      variableName: 'var2',
                      oldValue: undefined,
                      newValue: 'a-value',
                    },
                  ],
                },
              ]);
            });
          });
          describe('migrating instances', () => {
            let definitionId;
            let usedEngine;
            let engineName;
            let instanceId;

            afterEach(async () => {
              // stop the instance and remove the deployment
              await request
                .put(
                  `:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`,
                )
                .send({ instanceState: 'stopped' });

              await new Promise((resolve) => setTimeout(() => resolve(), 100));

              await deleteProcess(definitionId, engineName);

              await new Promise((resolve) => setTimeout(() => resolve(), 100));
            });

            test('can migrate an instance from one version of a process to another', async () => {
              definitionId = '_aef1a356-0d84-4afc-a0f6-c978dea07d96';

              engineName = 'machine1';
              [usedEngine] = getEngines(engineName);

              await deployProcess('migrationInitial', engineName);

              const userTask1FileName = `User_Task_0dqts41`;
              const userTask1 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'migrationExtended',
                  `${userTask1FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask1FileName}`)
                .send({
                  html: userTask1,
                });

              const userTask2FileName = `User_Task_09g3sdq`;
              const userTask2 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'migrationExtended',
                  `${userTask2FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask2FileName}`)
                .send({
                  html: userTask2,
                });

              instanceId = await startInstance(definitionId, 111, engineName);

              // after starting the process, wait 2 seconds
              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              let instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

              expect(instanceInfo.processVersion).toEqual('111');

              // deploy the new version
              await deployProcess('migrationExtended', engineName);

              // migrate the instance to the new version
              const migrationResponse = await request
                .post(`:${usedEngine.port}/process/${definitionId}/versions/111/instance/migration`)
                .send({
                  targetVersion: 123,
                  instanceIds: [instanceId],
                });

              expect(migrationResponse.status).toBe(200);

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              await request
                .post(
                  `:${usedEngine.port}/tasklist/api/userTask?instanceID=${instanceId}&userTaskID=Activity_1xguu75`,
                )
                .send({});

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'RUNNING',
                  currentFlowElementId: 'Activity_1pgsbor',
                  currentFlowNodeState: 'READY',
                  currentFlowNodeProgress: { value: 0, manual: false },
                  currentFlowElementStartTime: expect.any(Number),
                  previousFlowElementId: 'Flow_0a145pl',
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: {},
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_07xjwc1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1xguu75',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 100, manual: false },
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([
                {
                  type: 'MIGRATION',
                  time: expect.any(Number),
                  sourceVersion: '111',
                  targetVersion: '123',
                },
              ]);
            });

            test('can adapt tokens during migration with a tokenMapping', async () => {
              definitionId = '_aef1a356-0d84-4afc-a0f6-c978dea07d96';

              engineName = 'machine1';
              [usedEngine] = getEngines(engineName);

              await deployProcess('migrationInitial', engineName);

              const userTask1FileName = `User_Task_0dqts41`;
              const userTask1 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'migrationExtended',
                  `${userTask1FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask1FileName}`)
                .send({
                  html: userTask1,
                });

              const userTask2FileName = `User_Task_09g3sdq`;
              const userTask2 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'migrationExtended',
                  `${userTask2FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask2FileName}`)
                .send({
                  html: userTask2,
                });

              instanceId = await startInstance(definitionId, 111, engineName);

              // after starting the process, wait 2 seconds
              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              let instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

              expect(instanceInfo.processVersion).toEqual('111');

              // deploy the new version
              await deployProcess('migrationReplace', engineName);

              // migrate the instance to the new version
              const migrationResponse = await request
                .post(`:${usedEngine.port}/process/${definitionId}/versions/111/instance/migration`)
                .send({
                  targetVersion: 456,
                  instanceIds: [instanceId],
                  tokenMapping: {
                    move: [
                      {
                        tokenId: instanceInfo.tokens[0].tokenId,
                        currentFlowElementId: 'Activity_1pgsbor',
                      },
                    ],
                  },
                });

              expect(migrationResponse.status).toBe(200);

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              await request
                .post(
                  `:${usedEngine.port}/tasklist/api/userTask?instanceID=${instanceId}&userTaskID=Activity_1pgsbor`,
                )
                .send({});

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_0w5iuw9',
                  currentFlowNodeState: 'COMPLETED',
                  currentFlowElementStartTime: expect.any(Number),
                  previousFlowElementId: 'Flow_0dgw2dp',
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_07xjwc1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1xguu75',
                  executionState: 'SKIPPED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 0, manual: false },
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1pgsbor',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 100, manual: false },
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_0w5iuw9',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([
                {
                  type: 'MIGRATION',
                  time: expect.any(Number),
                  sourceVersion: '111',
                  targetVersion: '456',
                },
                {
                  type: 'TOKEN-MOVE',
                  time: expect.any(Number),
                  tokenId: expect.any(String),
                  currentFlowElementId: 'Activity_1xguu75',
                  targetFlowElementId: 'Activity_1pgsbor',
                },
              ]);
            });

            test('can adapt tokens during migration with a flowElementMapping', async () => {
              definitionId = '_aef1a356-0d84-4afc-a0f6-c978dea07d96';

              engineName = 'machine1';
              [usedEngine] = getEngines(engineName);

              await deployProcess('migrationInitial', engineName);

              const userTask1FileName = `User_Task_0dqts41`;
              const userTask1 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'migrationExtended',
                  `${userTask1FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask1FileName}`)
                .send({
                  html: userTask1,
                });

              const userTask2FileName = `User_Task_09g3sdq`;
              const userTask2 = fs.readFileSync(
                path.resolve(
                  __dirname,
                  'testProcesses',
                  'migrationExtended',
                  `${userTask2FileName}.html`,
                ),
                'utf-8',
              );
              await request
                .put(`:${usedEngine.port}/process/${definitionId}/user-tasks/${userTask2FileName}`)
                .send({
                  html: userTask2,
                });

              instanceId = await startInstance(definitionId, 111, engineName);

              // after starting the process, wait 2 seconds
              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              let instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

              expect(instanceInfo.processVersion).toEqual('111');

              // deploy the new version
              await deployProcess('migrationReplace', engineName);

              // migrate the instance to the new version
              const migrationResponse = await request
                .post(`:${usedEngine.port}/process/${definitionId}/versions/111/instance/migration`)
                .send({
                  targetVersion: 456,
                  instanceIds: [instanceId],
                  flowElementMapping: {
                    Activity_1xguu75: ['Activity_1pgsbor'],
                  },
                });

              expect(migrationResponse.status).toBe(200);

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              await request
                .post(
                  `:${usedEngine.port}/tasklist/api/userTask?instanceID=${instanceId}&userTaskID=Activity_1pgsbor`,
                )
                .send({});

              await new Promise((resolve) => setTimeout(() => resolve(), 1000));

              instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_0w5iuw9',
                  currentFlowNodeState: 'COMPLETED',
                  currentFlowElementStartTime: expect.any(Number),
                  previousFlowElementId: 'Flow_0dgw2dp',
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_07xjwc1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1xguu75',
                  executionState: 'SKIPPED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 0, manual: false },
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1pgsbor',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 100, manual: false },
                  milestones: {},
                  priority: 1,
                  performers: [],
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_0w5iuw9',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([
                {
                  type: 'MIGRATION',
                  time: expect.any(Number),
                  sourceVersion: '111',
                  targetVersion: '456',
                },
                {
                  type: 'TOKEN-MOVE',
                  time: expect.any(Number),
                  tokenId: expect.any(String),
                  currentFlowElementId: 'Activity_1xguu75',
                  targetFlowElementId: 'Activity_1pgsbor',
                },
              ]);
            });
            // TODO: Test forwarding and merging of adaptationLog
          });
        });
      });

      describe('static deployment', () => {
        test('basic process on single engine', async () => {
          const definitionId = '_1b1d06f3-dbab-49bd-8989-47af615bd071';

          let engineName = 'machine1';

          await deployProcess('basicStaticProcess', engineName);

          let instanceId = await startInstance(definitionId, 123, engineName);

          // after starting the process, wait 2 seconds before requesting the state of the instance
          // maybe think about a better solution: when to request the state after instance was started?
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const instanceInfo = await getInstanceInformation(definitionId, instanceId, engineName);

          expect(instanceInfo.instanceState).toEqual(['ENDED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'ENDED',
              currentFlowElementId: 'Event_0maz5yf',
              currentFlowNodeState: 'COMPLETED',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Flow_07g4pnw',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 0,
              deciderStorageTime: 0,
              intermediateVariablesState: null,
            },
          ]);
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_0xfbs3r',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Event_0maz5yf',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('two engines', async () => {
          const definitionId = '_272ea4bb-540f-4605-9b88-89eee3a1c205';

          // execution order: machine 1 -> machine 2
          let engineNames = ['machine1', 'machine2'];

          await deployProcess('twoEngineStatic', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const engineResponses = await Promise.all(
            engineNames.map((engine) =>
              getInstanceInformation(definitionId, instanceId, engine).then((response) => ({
                ...engine,
                response,
              })),
            ),
          );

          // check for instance information
          engineResponses.forEach((engine) => {
            const instanceInfo = engine.response;

            if (engine.name === 'machine1') {
              expect(instanceInfo.instanceState).toEqual(['FORWARDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'FORWARDED',
                  currentFlowElementId: 'Flow_0ioijmn',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                  nextMachine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    port: 33021,
                    name: 'machine2',
                  },
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0j1fp4s',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_0ioijmn',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  nextMachine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  progress: { value: 0, manual: false },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine2') {
              expect(instanceInfo.instanceState).toEqual(['ENDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_17thomc',
                  currentFlowNodeState: 'COMPLETED',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 1,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0j1fp4s',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_06wlm0q',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_17thomc',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine3') {
              expect(engine.response.status).toEqual(404);
            }
          });
        });

        test('two engines with variables', async () => {
          /**
           * Instance is executed by 2 engines which change variables
           * -> when passing token to different machine, previous updated variables will also be transmitted
           * -> variable "a", updated at script task Activity_018ajzu on machine 2 is updated respectively
           * on machine 1 when passing token
           */

          // execution order: machine 1 -> machine 2
          const definitionId = '_1c24441f-af22-46ef-a165-038c3231cbf6';

          // execution order: machine 1 -> machine 2
          let engineNames = ['machine1', 'machine2'];

          await deployProcess('twoEngineVariablesStatic', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 3 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 3000));

          const engineResponses = await Promise.all(
            engineNames.map((engine) =>
              getInstanceInformation(definitionId, instanceId, engine).then((response) => ({
                ...engine,
                response,
              })),
            ),
          );

          // check for instance information
          engineResponses.forEach((engine) => {
            const instanceInfo = engine.response;

            if (engine.name === 'machine1') {
              expect(instanceInfo.instanceState).toEqual(['ENDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_02s5s5e',
                  currentFlowNodeState: 'COMPLETED',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 2,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                },
              ]);
              expect(instanceInfo.variables).toEqual({
                a: {
                  log: [
                    {
                      changedBy: 'Activity_1q040zy',
                      changedTime: expect.any(Number),
                    },
                    {
                      changedBy: 'Activity_018ajzu', // changed on machine 2
                      changedTime: expect.any(Number),
                      oldValue: 5,
                    },
                  ],
                  value: 50,
                },
                b: {
                  log: [
                    {
                      changedBy: 'Activity_1q040zy',
                      changedTime: expect.any(Number),
                    },
                    {
                      changedBy: 'Activity_1okjejr',
                      changedTime: expect.any(Number),
                      oldValue: 10,
                    },
                  ],
                  value: 100,
                },
              });
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1q040zy',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 100, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Gateway_01qoyez',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1okjejr',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 100, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_09ovpq4',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  nextMachine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  progress: { value: 0, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_018ajzu',
                  executionState: 'COMPLETED',
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  progress: { value: 100, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Gateway_1yoqb3e',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_02s5s5e',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine2') {
              expect(instanceInfo.instanceState).toEqual(['FORWARDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'FORWARDED',
                  currentFlowElementId: 'Flow_1u0p01n',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 1,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                  nextMachine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
              ]);
              expect(instanceInfo.variables).toEqual({
                a: {
                  log: [
                    {
                      changedBy: 'Activity_1q040zy',
                      changedTime: expect.any(Number),
                    },
                    {
                      changedBy: 'Activity_018ajzu',
                      changedTime: expect.any(Number),
                      oldValue: 5,
                    },
                  ],
                  value: 50,
                },
                b: {
                  log: [
                    {
                      changedBy: 'Activity_1q040zy',
                      changedTime: expect.any(Number),
                    },
                  ],
                  value: 10,
                },
              });
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1q040zy',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 100, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Gateway_01qoyez',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_018ajzu',
                  executionState: 'COMPLETED',
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  progress: { value: 100, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_1u0p01n',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  nextMachine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  progress: { value: 0, manual: false },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine3') {
              expect(engine.response.status).toEqual(404);
            }
          });
        });

        test('two engines with termination endevent', async () => {
          /**
           * Running Instance will be aborted due to termination-event Event_04sczc5 triggered on machine 2
           * -> running token on machine 1 will be aborted immediately
           */

          // execution order: machine 1 -> machine 2
          const definitionId = '_23c39f9a-f326-4e8a-a5f7-9538ca7fe3b5';

          // execution order: machine 1 -> machine 2
          let engineNames = ['machine1', 'machine2'];

          await deployProcess('twoEngineTerminationStatic', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const engineResponses = await Promise.all(
            engineNames.map((engine) =>
              getInstanceInformation(definitionId, instanceId, engine).then((response) => ({
                ...engine,
                response,
              })),
            ),
          );

          // check for instance information
          engineResponses.forEach((engine) => {
            const instanceInfo = engine.response;

            if (engine.name === 'machine1') {
              expect(instanceInfo.instanceState).toEqual(['FORWARDED', 'ABORTED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'FORWARDED',
                  currentFlowElementId: 'Flow_03y5vg1',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                  nextMachine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
                {
                  tokenId: expect.any(String),
                  state: 'ABORTED',
                  currentFlowElementId: 'Activity_119hhzf',
                  currentFlowNodeState: 'TERMINATED',
                  currentFlowNodeProgress: { value: 0, manual: false },
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 0,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Gateway_0ewmf7i',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_0ddq1cb',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Flow_03y5vg1',
                  executionState: 'FORWARDED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  nextMachine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                  progress: { value: 0, manual: false },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_119hhzf',
                  executionState: 'ABORTED',
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  progress: { value: 0, manual: false },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }

            if (engine.name === 'machine2') {
              expect(instanceInfo.instanceState).toEqual(['ENDED']);
              expect(instanceInfo.tokens).toEqual([
                {
                  tokenId: expect.any(String),
                  state: 'ENDED',
                  currentFlowElementId: 'Event_04sczc5',
                  currentFlowNodeState: 'COMPLETED',
                  currentFlowElementStartTime: expect.any(Number),
                  localStartTime: expect.any(Number),
                  localExecutionTime: expect.any(Number),
                  machineHops: 1,
                  deciderStorageRounds: 0,
                  deciderStorageTime: 0,
                  intermediateVariablesState: null,
                },
              ]);
              expect(instanceInfo.log).toEqual([
                {
                  tokenId: expect.any(String),
                  flowElementId: 'StartEvent_1',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Gateway_0ewmf7i',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId1',
                    ip: expect.any(String),
                    name: 'machine1',
                    port: 33020,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Activity_1b1xntr',
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
                {
                  tokenId: expect.any(String),
                  flowElementId: 'Event_04sczc5', //termination end event
                  executionState: 'COMPLETED',
                  startTime: expect.any(Number),
                  endTime: expect.any(Number),
                  machine: {
                    id: 'machineId2',
                    ip: expect.any(String),
                    name: 'machine2',
                    port: 33021,
                  },
                },
              ]);

              expect(instanceInfo.adaptationLog).toEqual([]);
            }
          });
        });

        test('pause process at task', async () => {
          /**
           * Running Instance will be paused (via provided interface) while executing script task Activity_1m0u15u
           * -> instance state is supposed to be PAUSED
           * -> executed task will be finished, but next element won't
           */

          const definitionId = '_303e6640-39be-4205-a8b9-8e443880a562';

          let engineNames = ['machine1'];
          let [usedEngine] = getEngines(engineNames);

          await deployProcess('scriptTaskStaticProcess', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after starting the process, wait 1 second before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 100));

          const pauseResponse = await request
            .put(`:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`)
            .send({ instanceState: 'paused' });

          expect(pauseResponse.status).toBe(200);

          // after pausing the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['PAUSED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'PAUSED',
              currentFlowElementId: 'Flow_1t4tcmh',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Activity_1m0u15u',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 0,
              deciderStorageTime: 0,
              intermediateVariablesState: null,
            },
          ]);
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_1m0u15u',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
              progress: { value: 100, manual: false },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('RESUME process at task', async () => {
          /**
           * Running Instance will be paused (via provided interface) while executing script task Activity_1m0u15u
           * and resumed again
           */
          const definitionId = '_303e6640-39be-4205-a8b9-8e443880a562';

          let engineNames = ['machine1'];
          let [usedEngine] = getEngines(engineNames);

          await deployProcess('scriptTaskStaticProcess', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          await new Promise((resolve) => setTimeout(() => resolve(), 1000));

          const pauseResponse = await request
            .put(`:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`)
            .send({ instanceState: 'paused' });

          expect(pauseResponse.status).toBe(200);

          // after pausing the process, wait 2 seconds before resuming again
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const resumeResponse = await request
            .put(`:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`)
            .send({ instanceState: 'resume' });

          expect(resumeResponse.status).toBe(200);

          // after resuming the process, wait 2 seconds before requesting the state
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['ENDED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'ENDED',
              currentFlowElementId: 'Event_1yprmoh',
              currentFlowNodeState: 'COMPLETED',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Flow_1txhgvm',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 0,
              deciderStorageTime: 0,
              intermediateVariablesState: null,
            },
          ]);
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_1m0u15u',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
              progress: { value: 100, manual: false },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_1h9twnk',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Event_1yprmoh',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('pause process at catching event', async () => {
          /**
           * Running Instance will be paused (via provided interface) while executing catching event Event_0l2tx82
           * -> instance state is supposed to be PAUSED, token state remain untouched
           * -> executed task will be paused immediately
           */

          const definitionId = '_2dc39d53-1ced-4a21-b220-732d70742549';

          let engineNames = ['machine1'];
          let [usedEngine] = getEngines(engineNames);

          await deployProcess('timerCatchingStaticProcess', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          await new Promise((resolve) => setTimeout(() => resolve(), 1000));

          const pauseResponse = await request
            .put(`:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`)
            .send({ instanceState: 'paused' });

          expect(pauseResponse.status).toBe(200);

          // after pausing the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['PAUSED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'PAUSED',
              currentFlowElementId: 'Event_0l2tx82',
              currentFlowNodeState: 'ACTIVE',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Flow_0a1knek',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 0,
              deciderStorageTime: 0,
              intermediateVariablesState: {},
            },
          ]);
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('resume process at catching event', async () => {
          /**
           * Running Instance will be paused (via provided interface) while executing catching event Event_0l2tx82
           * and resumed again
           */

          const definitionId = '_2dc39d53-1ced-4a21-b220-732d70742549';

          let engineNames = ['machine1'];
          let [usedEngine] = getEngines(engineNames);

          await deployProcess('timerCatchingStaticProcess', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          await new Promise((resolve) => setTimeout(() => resolve(), 1000));

          const pauseResponse = await request
            .put(`:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`)
            .send({ instanceState: 'paused' });

          expect(pauseResponse.status).toBe(200);

          // after pausing the process, wait 2 seconds before resuming again
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const resumeResponse = await request
            .put(`:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`)
            .send({ instanceState: 'resume' });

          expect(resumeResponse.status).toBe(200);

          // after resuming the process, wait 4 seconds before requesting the state
          await new Promise((resolve) => setTimeout(() => resolve(), 4000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['ENDED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'ENDED',
              currentFlowElementId: 'Event_1kos1cn',
              currentFlowNodeState: 'COMPLETED',
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Flow_1hi46vz',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 0,
              deciderStorageTime: 0,
              intermediateVariablesState: null,
            },
          ]);
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Event_0l2tx82',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_042ziaw',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Event_1kos1cn',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });
        test('stop process at task', async () => {
          /**
           * Running Instance will be stopped (via provided interface) while executing script-task Activity_1m0u15u
           * -> instance state is supposed to be STOPPED, token state remain untouched
           * -> executed task will be stopped and logged
           */

          const definitionId = '_303e6640-39be-4205-a8b9-8e443880a562';

          let engineNames = ['machine1'];
          let [usedEngine] = getEngines(engineNames);

          await deployProcess('scriptTaskStaticProcess', engineNames);

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          await new Promise((resolve) => setTimeout(() => resolve(), 1000));

          const stopResponse = await request
            .put(`:${usedEngine.port}/process/${definitionId}/instance/${instanceId}/instanceState`)
            .send({ instanceState: 'stopped' });

          expect(stopResponse.status).toBe(200);

          // after stopping the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 2000));

          const instanceInfo = await getInstanceInformation(
            definitionId,
            instanceId,
            engineNames[0],
          );

          expect(instanceInfo.instanceState).toEqual(['STOPPED']);
          expect(instanceInfo.tokens).toEqual([
            {
              tokenId: expect.any(String),
              state: 'RUNNING',
              currentFlowElementId: 'Activity_1m0u15u',
              currentFlowNodeState: 'ACTIVE',
              currentFlowNodeProgress: { value: 0, manual: false },
              currentFlowElementStartTime: expect.any(Number),
              previousFlowElementId: 'Flow_0n4ueli',
              localStartTime: expect.any(Number),
              localExecutionTime: expect.any(Number),
              machineHops: 0,
              deciderStorageRounds: 0,
              deciderStorageTime: 0,
              intermediateVariablesState: {},
            },
          ]);
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_1m0u15u',
              executionState: 'STOPPED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
              progress: { value: 0, manual: false },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });

        test('execute a process containing a call activity that contains a user task', async () => {
          const definitionId = '_58ea5281-66c9-45a5-a477-a0dbcb62c87a';
          const calledProcessDefinitionId = '_aef1a356-0d84-4afc-a0f6-c978dea07d96';

          let engineNames = ['machine1'];
          let [usedEngine] = getEngines(engineNames);

          await deployProcess('callActivityStaticProcess', engineNames);
          await deployProcess('adaptiveProcess', engineNames);

          const userTask1FileName = `User_Task_0dqts41`;
          const userTask1 = fs.readFileSync(
            path.resolve(
              __dirname,
              'testProcesses',
              'adaptiveProcess',
              `${userTask1FileName}.html`,
            ),
            'utf-8',
          );
          await request
            .put(
              `:${usedEngine.port}/process/${calledProcessDefinitionId}/user-tasks/${userTask1FileName}`,
            )
            .send({
              html: userTask1,
            });

          const userTask2FileName = `User_Task_09g3sdq`;
          const userTask2 = fs.readFileSync(
            path.resolve(
              __dirname,
              'testProcesses',
              'adaptiveProcess',
              `${userTask2FileName}.html`,
            ),
            'utf-8',
          );
          await request
            .put(
              `:${usedEngine.port}/process/${calledProcessDefinitionId}/user-tasks/${userTask2FileName}`,
            )
            .send({
              html: userTask2,
            });

          let instanceId = await startInstance(definitionId, 123, engineNames[0]);

          // after stopping the process, wait 2 seconds before requesting the state of the instance
          await new Promise((resolve) => setTimeout(() => resolve(), 4000));

          let { body: userTasksInformation } = await request.get(
            `:${usedEngine.port}/tasklist/api`,
          );

          const userTaskInformation = userTasksInformation.find(
            (userTask) => userTask.id === 'Activity_1xguu75',
          );

          // the token in the original instance should hold a reference to the called instance
          let instanceInfo = await getInstanceInformation(definitionId, instanceId, engineNames[0]);
          expect(instanceInfo.tokens[0].calledInstance).toBe(userTaskInformation.instanceID);

          // the instance of the imported process should reference the original instance
          const calledInstanceInfo = await getInstanceInformation(
            calledProcessDefinitionId,
            userTaskInformation.instanceID,
            engineNames[0],
          );

          expect(calledInstanceInfo.callingInstance).toBe(instanceId);

          await request
            .post(
              `:${usedEngine.port}/tasklist/api/userTask?instanceID=${userTaskInformation.instanceID}&userTaskID=${userTaskInformation.id}`,
            )
            .send({});

          await new Promise((resolve) => setTimeout(resolve, 100));

          instanceInfo = await getInstanceInformation(definitionId, instanceId, engineNames[0]);

          // the token should not reference the called instance anymore
          expect(instanceInfo.tokens[0]).not.toHaveProperty('calledInstance');

          // the log entry for the callActivity should reference the called instance
          expect(instanceInfo.log).toEqual([
            {
              tokenId: expect.any(String),
              flowElementId: 'StartEvent_1tbhzra',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Activity_1dotfaz',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
              calledInstance: userTaskInformation.instanceID,
            },
            {
              tokenId: expect.any(String),
              flowElementId: 'Event_02k934p',
              executionState: 'COMPLETED',
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              machine: {
                id: 'machineId1',
                ip: expect.any(String),
                name: 'machine1',
                port: 33020,
              },
            },
          ]);

          expect(instanceInfo.adaptationLog).toEqual([]);
        });
      });
    });
  });
});
