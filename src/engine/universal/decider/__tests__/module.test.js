/* eslint-disable import/no-dynamic-require */
jest.mock('@proceed/machine', () => ({
  logging: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn,
      error: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
    }),
  },
  information: {
    getMachineInformation: jest.fn(),
  },
  config: {
    readConfig: jest.fn(),
  },
}));

const { information, config } = require('@proceed/machine');
const Hceval = require('../hard_constraint_evaluation/hc-eval.js');
const decider = require('../module');
const constraintManager = require('../constraintManager');

const path = './../../../../helper-modules/constraint-parser-xml-json/__tests__/ConstraintsJSON/';

const test1Input = require(`${path}AND-ConstraintGroupJSON.json`).processConstraints;
const test2Input = require(`${path}1-ConstraintsJSON.json`).processConstraints;
const sameMachineConstraint = require(`${path}sameMachineConstraint1JSON.json`).processConstraints;
const maxMachineHopsConstraint =
  require(`${path}maxMachineHopsConstraintJSON.json`).processConstraints;

beforeAll(() => {
  Date.now = jest.fn().mockReturnValue(new Date('2020-03-13T11:21:00'));
  config.readConfig.mockReturnValue({
    router: {},
    processes: {
      deactivateProcessExecution: false,
      acceptUserTasks: true,
    },
    maxTimeProcessGlobal: -1,
    maxTimeProcessLocal: -1,
    maxTimeFlowNode: -1,
  });
});

describe('#preCheckAbort', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('call evaluation with correct parameters for flowNodeConstraints and processConstraints', async () => {
    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'),
      flowNodeTime: 100,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 1,
    };
    // maxMachineHops = 2
    const flowNodeConstraints = maxMachineHopsConstraint.hardConstraints;
    const processConstraints = maxMachineHopsConstraint.hardConstraints;

    const evaluateExecutionConstraints = jest.spyOn(Hceval, 'evaluateExecutionConstraints');
    await decider.preCheckAbort({}, token, flowNodeConstraints, processConstraints);
    expect(evaluateExecutionConstraints).toHaveBeenNthCalledWith(1, [], {
      time: 2000,
      timeGlobal: 60000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 1,
    });

    expect(Hceval.evaluateExecutionConstraints).toHaveBeenNthCalledWith(2, flowNodeConstraints, {
      time: 100,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 1,
    });
  });
  test('processConstraints fulfilled', async () => {
    Date.now = jest.fn().mockReturnValue(new Date('2020-03-13T11:21:00'));
    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'),
      flowNodeTime: 100,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 1,
    };
    // maxMachineHops = 2
    const processConstraints = maxMachineHopsConstraint.hardConstraints;
    expect(await decider.preCheckAbort({}, token, [], processConstraints)).toEqual({
      stopProcess: null,
      unfulfilledConstraints: [],
    });
  });

  test('processConstraints not fulfilled', async () => {
    Date.now = jest.fn().mockReturnValue(new Date('2020-03-13T11:21:00'));
    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'),
      flowNodeTime: 100,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 3,
    };
    // maxMachineHops = 2
    const processConstraints = maxMachineHopsConstraint.hardConstraints;
    expect(await decider.preCheckAbort({}, token, [], processConstraints)).toEqual({
      stopProcess: 'instance',
      unfulfilledConstraints: ['maxMachineHops'],
    });
  });

  test('flowNodeConstraints fulfilled', async () => {
    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'),
      flowNodeTime: 100,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 1,
    };
    // maxMachineHops = 2
    const flowNodeConstraints = maxMachineHopsConstraint.hardConstraints;
    expect(await decider.preCheckAbort({}, token, flowNodeConstraints, [])).toEqual({
      stopProcess: null,
      unfulfilledConstraints: [],
    });
  });

  test('flowNodeConstraints not fulfilled', async () => {
    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'),
      flowNodeTime: 100,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 3,
    };
    // maxMachineHops = 2
    const flowNodeConstraints = maxMachineHopsConstraint.hardConstraints;
    expect(await decider.preCheckAbort({}, token, flowNodeConstraints, [])).toEqual({
      stopProcess: 'token',
      unfulfilledConstraints: ['maxMachineHops'],
    });
  });

  test('profile config maxTimeProcessGlobal not fulfilled', async () => {
    config.readConfig.mockReturnValueOnce({
      maxTimeProcessGlobal: 59,
      maxTimeProcessLocal: -1,
      maxTimeFlowNode: -1,
    });
    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'), // started 60 sec before current time
      flowNodeTime: 100,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 3,
    };

    // profile config maxTimeFlowNode is exceed (see flowNodeTime)
    expect(await decider.preCheckAbort({}, token, [], [])).toEqual({
      stopProcess: 'instance',
      unfulfilledConstraints: ['maxTimeProcessGlobal'],
    });
  });

  test('profile config maxTimeProcessLocal not fulfilled', async () => {
    config.readConfig.mockReturnValueOnce({
      maxTimeProcessGlobal: -1,
      maxTimeProcessLocal: 1,
      maxTimeFlowNode: -1,
    });
    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'),
      flowNodeTime: 100,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 3,
    };

    // profile config maxTimeFlowNode is exceed (see flowNodeTime)
    expect(await decider.preCheckAbort({}, token, [], [])).toEqual({
      stopProcess: 'instance',
      unfulfilledConstraints: ['maxTimeProcessLocal'],
    });
  });

  test('profile config maxTimeFlowNode not fulfilled', async () => {
    config.readConfig.mockReturnValueOnce({
      maxTimeProcessGlobal: -1,
      maxTimeProcessLocal: -1,
      maxTimeFlowNode: 1,
    });

    const token = {
      globalStartTime: new Date('2020-03-13T11:20:00'),
      flowNodeTime: 2000,
      localExecutionTime: 2000,
      storageTime: 1000,
      storageRounds: 5,
      machineHops: 3,
    };

    // profile config maxTimeFlowNode is exceed (see flowNodeTime)
    expect(await decider.preCheckAbort({}, token, [], [])).toEqual({
      stopProcess: 'token',
      unfulfilledConstraints: ['maxTimeFlowNode'],
    });
  });
});

describe('#allowedtoexecuteLocally', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('throw Error when processInfo is missing', async () => {
    // https://jestjs.io/docs/en/asynchronous#asyncawait
    await expect(decider.allowedToExecuteLocally(undefined, {}, {}, {})).rejects.toThrow();
  });

  test('return true immediately if no constraints are given', async () => {
    expect(await decider.allowedToExecuteLocally({}, {}, {}, {})).toEqual(true);
  });

  test('return false because of preCheckAbort', async () => {
    const token = {
      globalStartTime: new Date('2020-02-25T11:20:00'),
      localStartTime: new Date('2020-02-25T13:30:00'),
      localExecutionTime: 360,
      machineHops: 3,
    };
    // maxMachineHops = 2
    expect(await decider.allowedToExecuteLocally({}, token, maxMachineHopsConstraint, {})).toEqual(
      false,
    );
    const machineSatisfiesAllHardConstraints = jest.spyOn(
      Hceval,
      'machineSatisfiesAllHardConstraints',
    );
    expect(machineSatisfiesAllHardConstraints).not.toHaveBeenCalled();
  });

  test('all hardconstraints are fullfiled', async () => {
    const infos = {
      os: {
        platform: 'linux',
        distro: 'Ubuntu',
      },
      inputs: ['Touch', 'Mouse'],
      network: {
        ip4: '111.111.111.111',
      },
      cpu: {
        currentLoad: 59,
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine

    expect(await decider.allowedToExecuteLocally({}, {}, test1Input, {})).toEqual(true);
  });

  test('not all hardconstraints are fullfiled', async () => {
    const infos = {
      os: {
        platform: 'windows',
        distro: 'Windows10',
      },
      inputs: ['Touch', 'Mouse'],
      network: {
        ip4: '111.111.111.111',
      },
      cpu: {
        currentLoad: 59,
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine

    expect(await decider.allowedToExecuteLocally({}, {}, test1Input, {})).toEqual(false);
  });
});

describe('#findOptimalNextMachine', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('throw Error when parameters are missing', async () => {
    // https://jestjs.io/docs/en/asynchronous#asyncawait
    await expect(decider.findOptimalNextMachine(undefined, {}, {}, {})).rejects.toThrow();
    await expect(decider.findOptimalNextMachine({}, undefined, {}, {})).rejects.toThrow();
  });

  test('stopProcess token', async () => {
    const token = {
      globalStartTime: new Date('2020-02-25T11:20:00'),
      localStartTime: new Date('2020-02-25T13:30:00'),
      localExecutionTime: 360,
      machineHops: 3,
    };
    expect(await decider.findOptimalNextMachine({}, token, maxMachineHopsConstraint, {})).toEqual({
      engineList: [],
      prioritized: false,
      abortCheck: {
        stopProcess: 'token',
        unfulfilledConstraints: ['maxMachineHops'],
      },
    });
  });

  test('stopProcess instance', async () => {
    const token = {
      globalStartTime: new Date('2020-02-25T11:20:00'),
      localStartTime: new Date('2020-02-25T13:30:00'),
      localExecutionTime: 360,
      machineHops: 3,
    };
    expect(await decider.findOptimalNextMachine({}, token, {}, maxMachineHopsConstraint)).toEqual({
      engineList: [],
      prioritized: false,
      abortCheck: {
        stopProcess: 'instance',
        unfulfilledConstraints: ['maxMachineHops'],
      },
    });
  });

  test('execution allowed only locally and no other constraints given', async () => {
    expect(await decider.findOptimalNextMachine({}, {}, {}, sameMachineConstraint)).toEqual({
      engineList: [{ id: 'local-engine' }],
      prioritized: false,
      abortCheck: {
        stopProcess: null,
        unfulfilledConstraints: [],
      },
    });
  });

  test('execution allowed only locally and constraints fulfilled on local engine', async () => {
    const infos = {
      os: {
        platform: 'linux',
        distro: 'Ubuntu',
      },
      inputs: ['Touch', 'Mouse'],
      network: {
        ip4: '111.111.111.111',
      },
      cpu: {
        currentLoad: 59,
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine

    expect(await decider.findOptimalNextMachine({}, {}, test1Input, sameMachineConstraint)).toEqual(
      {
        engineList: [{ id: 'local-engine' }],
        prioritized: false,
        abortCheck: {
          stopProcess: null,
          unfulfilledConstraints: [],
        },
      },
    );
  });

  test('execution allowed only locally and constraints not fulfilled on local engine', async () => {
    const infos = {
      os: {
        platform: 'windows',
        distro: 'Windows10',
      },
      inputs: ['Touch', 'Mouse'],
      network: {
        ip4: '111.111.111.111',
      },
      cpu: {
        currentLoad: 59,
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine
    expect(await decider.findOptimalNextMachine({}, {}, test1Input, sameMachineConstraint)).toEqual(
      {
        engineList: [],
        prioritized: false,
        abortCheck: {
          stopProcess: null,
          unfulfilledConstraints: [],
        },
      },
    );
  });

  test('hardConstraints not fulfilled locally', async () => {
    const infos = {
      os: {
        platform: 'windows',
        distro: 'Windows10',
      },
      inputs: ['Touch', 'Mouse'],
      network: {
        ip4: '111.111.111.111',
      },
      cpu: {
        currentLoad: 59,
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine

    constraintManager.getExternalSoftConstraintValues = jest.fn().mockReturnValue([]);

    expect(await decider.findOptimalNextMachine({}, {}, test1Input, {})).toEqual({
      engineList: [],
      prioritized: false,
      abortCheck: {
        stopProcess: null,
        unfulfilledConstraints: [],
      },
    });
  });

  test('hardConstraints fulfilled locally', async () => {
    const infos = {
      os: {
        platform: 'linux',
        distro: 'Ubuntu',
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine

    constraintManager.getExternalSoftConstraintValues = jest.fn().mockReturnValue([]);

    expect(await decider.findOptimalNextMachine({}, {}, test1Input, {})).toEqual({
      engineList: [
        {
          id: 'local-engine',
        },
      ],
      prioritized: false,
      abortCheck: {
        stopProcess: null,
        unfulfilledConstraints: [],
      },
    });
  });

  test('execution prefered locally and hardconstraints fulfilled', async () => {
    const infos = {
      os: {
        platform: 'linux',
        distro: 'Ubuntu',
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine

    config.readConfig.mockReturnValueOnce({
      router: {
        softConstraintPolicy: 'PreferLocalMachine',
      },
    });

    expect(await decider.findOptimalNextMachine({}, {}, test1Input, {})).toEqual({
      engineList: [
        {
          id: 'local-engine',
        },
      ],
      prioritized: false,
      abortCheck: {
        stopProcess: null,
        unfulfilledConstraints: [],
      },
    });
  });

  test('execution prefered locally and hardconstraints not fulfilled', async () => {
    const infos = {
      os: {
        platform: 'windows',
        distro: 'Windows10',
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine

    config.readConfig.mockReturnValueOnce({
      router: {
        softConstraintPolicy: 'PreferLocalMachine',
      },
    });

    expect(await decider.findOptimalNextMachine({}, {}, test1Input, {})).toEqual({
      engineList: [],
      prioritized: false,
      abortCheck: {
        stopProcess: null,
        unfulfilledConstraints: [],
      },
    });
  });

  test('unprioritized engineList if no softconstraints are given', async () => {
    const infos = {
      os: {
        platform: 'linux',
        distro: 'Ubuntu',
      },
    };

    information.getMachineInformation.mockResolvedValue(infos); // infos for local machine
    constraintManager.getLocalSoftConstraintValues = jest.fn().mockReturnValue({});

    constraintManager.getExternalSoftConstraintValues = jest.fn().mockReturnValue([
      { id: 'machine-1', softConstraintValues: {} },
      { id: 'machine-2', softConstraintValues: {} },
      { id: 'machine-3', softConstraintValues: {} },
    ]);
    expect(await decider.findOptimalNextMachine({}, {}, test1Input, {})).toEqual({
      engineList: [
        { id: 'local-engine' },
        { id: 'machine-1' },
        { id: 'machine-2' },
        { id: 'machine-3' },
      ],
      prioritized: false,
      abortCheck: {
        stopProcess: null,
        unfulfilledConstraints: [],
      },
    });
  });

  test('prioritized engineList sorted by highest score for softconstraints', async () => {
    const machineMemFree = 'machine.mem.free';

    constraintManager.getLocalSoftConstraintValues = jest
      .fn()
      .mockReturnValue({ [machineMemFree]: 8000 });

    constraintManager.getExternalSoftConstraintValues = jest.fn().mockReturnValue([
      { id: 'machine-1', softConstraintValues: { [machineMemFree]: 4000 } },
      { id: 'machine-2', softConstraintValues: { [machineMemFree]: 6000 } },
      { id: 'machine-3', softConstraintValues: { [machineMemFree]: 12000 } },
    ]);

    expect(await decider.findOptimalNextMachine({}, {}, test2Input, {})).toEqual({
      engineList: [
        { id: 'machine-3' },
        { id: 'local-engine' },
        { id: 'machine-2' },
        { id: 'machine-1' },
      ],
      prioritized: true,
      abortCheck: {
        stopProcess: null,
        unfulfilledConstraints: [],
      },
    });
  });
});

describe('#findOptimalExternalMachine', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('throw Error when parameters are missing', async () => {
    await expect(decider.findOptimalExternalMachine(undefined, {}, {})).rejects.toThrow();
  });

  test('unprioritized engineList if no softconstraints are given', async () => {
    constraintManager.getExternalSoftConstraintValues = jest.fn().mockReturnValue([
      { id: 'machine-1', softConstraintValues: {} },
      { id: 'machine-2', softConstraintValues: {} },
      { id: 'machine-3', softConstraintValues: {} },
    ]);
    expect(await decider.findOptimalExternalMachine({}, test1Input, {})).toEqual({
      engineList: [{ id: 'machine-1' }, { id: 'machine-2' }, { id: 'machine-3' }],
      prioritized: false,
    });
  });

  test('prioritized engineList sorted by highest score for softconstraints', async () => {
    const machineMemFree = 'machine.mem.free';
    constraintManager.getExternalSoftConstraintValues = jest.fn().mockReturnValue([
      { id: 'machine-1', softConstraintValues: { [machineMemFree]: 4000 } },
      { id: 'machine-2', softConstraintValues: { [machineMemFree]: 6000 } },
      { id: 'machine-3', softConstraintValues: { [machineMemFree]: 12000 } },
    ]);
    expect(await decider.findOptimalExternalMachine({}, test2Input, {})).toEqual({
      engineList: [{ id: 'machine-3' }, { id: 'machine-2' }, { id: 'machine-1' }],
      prioritized: true,
    });
  });
});
