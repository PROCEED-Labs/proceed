/* eslint-disable import/no-dynamic-require */
jest.mock('@proceed/distribution', () => ({
  communication: {
    getAvailableMachines: jest.fn(),
  },
}));

jest.mock('@proceed/machine', () => ({
  information: {
    getMachineInformation: jest.fn(),
  },
  config: {
    readConfig: jest.fn(),
  },
}));

const { config } = require('@proceed/machine');
const { network } = require('@proceed/system');
const { communication } = require('@proceed/distribution');
const constraintManager = require('../constraintManager');

const path = './../../../../helper-modules/constraint-parser-xml-json/__tests__/ConstraintsJSON/';

const sameMachineConstraint1 = require(`${path}sameMachineConstraint1JSON.json`).processConstraints;
const sameMachineConstraint2 = require(`${path}sameMachineConstraint2JSON.json`).processConstraints;

const exampleConstraints = require(`${path}1-ConstraintsJSON.json`).processConstraints;

const expectedIpConstraint = require('./data/ConstraintJSON/expectedIp.json').processConstraints;

beforeAll(() => {
  network.sendRequest = jest.fn();
  communication.getAvailableMachines = jest.fn();
  config.readConfig = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('#preCheckLocalExec', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('constraint sameMachine as true', async () => {
    expect(
      await constraintManager.preCheckLocalExec(sameMachineConstraint1.hardConstraints),
    ).toEqual(true);
  });

  test('constraint sameMachine as false', async () => {
    expect(
      await constraintManager.preCheckLocalExec(sameMachineConstraint2.hardConstraints),
    ).toEqual(false);
  });

  test('no constraint sameMachine given', async () => {
    expect(await constraintManager.preCheckLocalExec(exampleConstraints.hardConstraints)).toEqual(
      false,
    );
  });

  test('softConstraintPolicy is LocalMachineOnly', async () => {
    config.readConfig.mockResolvedValue('LocalMachineOnly');
    expect(await constraintManager.preCheckLocalExec(exampleConstraints.hardConstraints)).toEqual(
      true,
    );
  });
});

describe('#sendHardConstraints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('no allowed machines available', (done) => {
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '222.222.222.222', id: 'machine-4' },
    ]);

    const callback = jest.fn();

    constraintManager.sendHardConstraints(
      exampleConstraints.hardConstraints,
      exampleConstraints.softConstraints,
      {},
      callback,
    );

    setTimeout(() => {
      // no allowed machines available -> no request to be sent
      expect(network.sendRequest).toHaveBeenCalledTimes(0);
      expect(callback).toHaveBeenCalledTimes(1);
      done();
    }, 0);
  });

  test('called with additionalMachines', (done) => {
    // this machine should be excluded due to the provided constraints
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '222.222.222.222', id: 'machine-4' },
    ]);
    network.sendRequest.mockResolvedValue({ body: JSON.stringify(false) });

    const callback = jest.fn();

    constraintManager.sendHardConstraints(
      exampleConstraints.hardConstraints,
      exampleConstraints.softConstraints,
      {},
      callback,
      // we provide a machine that fits the constraint
      [{ ip: '111.111.111.111', port: '12345', id: 'machine' }],
    );

    setTimeout(() => {
      // we expect the provided machine to have been called
      expect(network.sendRequest).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledTimes(1);
      done();
    });
  });

  test('calls machine only once', (done) => {
    // this machine should be excluded due to the provided constraints
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '111.111.111.111', port: '12345', id: 'machine' },
    ]);
    network.sendRequest.mockResolvedValue({ body: JSON.stringify(false) });

    const callback = jest.fn();

    constraintManager.sendHardConstraints(
      exampleConstraints.hardConstraints,
      exampleConstraints.softConstraints,
      {},
      callback,
      // we provide a machine that fits the constraint
      [{ ip: '111.111.111.111', port: '12345', id: 'machine' }],
    );

    setTimeout(() => {
      // we expect the provided machine to have been called
      expect(network.sendRequest).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledTimes(1);
      done();
    });
  });

  test('requests every allowed machine', (done) => {
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '111.111.111.111', id: 'machine-1' },
      { ip: '123.123.123.123', id: 'machine-2' },
      { ip: '101.101.101.101', id: 'machine-3' },
      { ip: '222.222.222.222', id: 'machine-4' },
    ]);
    network.sendRequest.mockResolvedValue({ body: JSON.stringify(false) });

    const callback = jest.fn();

    constraintManager.sendHardConstraints(
      exampleConstraints.hardConstraints,
      exampleConstraints.softConstraints,
      {},
      callback,
    );

    setTimeout(() => {
      // only 3 out of 4 available machines get requested due to adress-constraints in exampleConstraints
      expect(network.sendRequest).toHaveBeenCalledTimes(3);
      expect(callback).toBeCalledTimes(3);
      done();
    }, 0);
  });

  test('forces call to expected ip (with default port) in constraint if no available machine has the ip', (done) => {
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '222.222.222.222', id: 'machine-4' },
    ]);
    network.sendRequest.mockResolvedValueOnce({
      body: JSON.stringify({ 'machine.mem.free': 500 }),
    });
    network.sendRequest.mockResolvedValueOnce({
      body: JSON.stringify({ id: 'machine-1', name: 'externalMachine' }),
    });

    const callback = jest.fn();

    constraintManager.sendHardConstraints(
      expectedIpConstraint.hardConstraints,
      expectedIpConstraint.softConstraints,
      {},
      callback,
    );

    setTimeout(() => {
      // machine not locally available but is called using provided ip and default port
      expect(network.sendRequest).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toBeCalledWith(
        {
          id: 'machine-1',
          ip: '111.111.111.111',
          port: 33029,
          name: 'externalMachine',
          softConstraintValues: { 'machine.mem.free': 500 },
        },
        false,
      );
      done();
    }, 0);
  });

  test('callback called with no values if machine gives false as response', (done) => {
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '111.111.111.111', id: 'machine-1' },
    ]);
    network.sendRequest.mockResolvedValue({
      body: JSON.stringify(false),
    });

    const callback = jest.fn();

    constraintManager.sendHardConstraints(
      exampleConstraints.hardConstraints,
      exampleConstraints.softConstraints,
      {},
      callback,
    );

    setTimeout(() => {
      expect(network.sendRequest).toHaveBeenCalledTimes(1);
      expect(callback).toBeCalledWith(undefined, false);
      done();
    }, 10);
  });

  test('callback called with softConstraint values if hardConstraints are fulfilled for machine', (done) => {
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '111.111.111.111', id: 'machine-1' },
    ]);
    const machineMemFree = 'machine.mem.free';
    network.sendRequest.mockResolvedValue({
      body: JSON.stringify({ [machineMemFree]: 500 }),
    });

    const callback = jest.fn();

    constraintManager.sendHardConstraints(
      exampleConstraints.hardConstraints,
      exampleConstraints.softConstraints,
      {},
      callback,
    );

    setTimeout(() => {
      expect(network.sendRequest).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        {
          id: 'machine-1',
          ip: '111.111.111.111',
          port: undefined,
          softConstraintValues: {
            [machineMemFree]: 500,
          },
        },
        false,
      );
      done();
    }, 0);
  });
});

describe('#getExternalSoftConstraintValues', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('valueList contains machines with softConstraintValues', async () => {
    config.readConfig.mockResolvedValue({
      router: {
        waitTimeExternalEvaluations: 1000,
      },
      engine: {
        networkRequestTimeout: 1,
      },
    });

    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '111.111.111.111', id: 'machine-1' },
      { ip: '123.123.123.123', id: 'machine-2' },
      { ip: '101.101.101.101', id: 'machine-3' },
      { ip: '222.222.222.222', id: 'machine-4' },
    ]);

    const machineMemFree = 'machine.mem.free';
    network.sendRequest
      .mockResolvedValueOnce({
        body: JSON.stringify({ [machineMemFree]: 500 }),
      })
      .mockResolvedValueOnce({
        body: JSON.stringify({ [machineMemFree]: 1000 }),
      })
      .mockResolvedValueOnce({
        body: JSON.stringify({ [machineMemFree]: 2000 }),
      });

    expect(
      await constraintManager.getExternalSoftConstraintValues(
        exampleConstraints.hardConstraints,
        exampleConstraints.softConstraints,
        {},
      ),
    ).toEqual([
      {
        id: 'machine-1',
        ip: '111.111.111.111',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 500 },
      },
      {
        id: 'machine-2',
        ip: '123.123.123.123',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 1000 },
      },
      {
        id: 'machine-3',
        ip: '101.101.101.101',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 2000 },
      },
    ]);
  });

  test('valueList contains machines with softConstraintValues for additionalMachines', async () => {
    config.readConfig.mockResolvedValue({
      router: {
        waitTimeExternalEvaluations: 1000,
      },
      engine: {
        networkRequestTimeout: 1,
      },
    });

    communication.getAvailableMachines.mockReturnValueOnce([]);

    const machineMemFree = 'machine.mem.free';
    network.sendRequest
      .mockResolvedValueOnce({
        body: JSON.stringify({ [machineMemFree]: 500 }),
      })
      .mockResolvedValueOnce({
        body: JSON.stringify({ [machineMemFree]: 1000 }),
      })
      .mockResolvedValueOnce({
        body: JSON.stringify({ [machineMemFree]: 2000 }),
      });

    expect(
      await constraintManager.getExternalSoftConstraintValues(
        exampleConstraints.hardConstraints,
        exampleConstraints.softConstraints,
        {},
        [
          { ip: '111.111.111.111', id: 'machine-1' },
          { ip: '123.123.123.123', id: 'machine-2' },
          { ip: '101.101.101.101', id: 'machine-3' },
          { ip: '222.222.222.222', id: 'machine-4' },
        ],
      ),
    ).toEqual([
      {
        id: 'machine-1',
        ip: '111.111.111.111',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 500 },
      },
      {
        id: 'machine-2',
        ip: '123.123.123.123',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 1000 },
      },
      {
        id: 'machine-3',
        ip: '101.101.101.101',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 2000 },
      },
    ]);
  });

  test('do not listen for further answers after networkRequestTimeout expired', async () => {
    config.readConfig.mockResolvedValue({
      router: {
        waitTimeExternalEvaluations: 1000,
      },
      engine: {
        networkRequestTimeout: 1,
      },
    });
    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '111.111.111.111', id: 'machine-1' },
      { ip: '123.123.123.123', id: 'machine-2' },
      { ip: '101.101.101.101', id: 'machine-3' },
      { ip: '222.222.222.222', id: 'machine-4' },
    ]);

    const machineMemFree = 'machine.mem.free';
    network.sendRequest
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  body: JSON.stringify({ [machineMemFree]: 500 }),
                }),
              100,
            ),
          ),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  body: JSON.stringify({ [machineMemFree]: 1000 }),
                }),
              200,
            ),
          ),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  body: JSON.stringify({ [machineMemFree]: 2000 }),
                }),
              2000, // return after 2 seconds, after networkRequestTimeout already expired
            ),
          ),
      );
    expect(
      await constraintManager.getExternalSoftConstraintValues(
        exampleConstraints.hardConstraints,
        exampleConstraints.softConstraints,
        {},
      ),
    ).toEqual([
      {
        id: 'machine-1',
        ip: '111.111.111.111',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 500 },
      },
      {
        id: 'machine-2',
        ip: '123.123.123.123',
        port: undefined,
        softConstraintValues: { [machineMemFree]: 1000 },
      },
    ]);
  });

  test('do not listen for further answers after finding firsting fitting machine if softConstraintPolicy is OnFirstFittingMachine', async () => {
    config.readConfig.mockResolvedValue({
      router: {
        waitTimeExternalEvaluations: 1000,
        softConstraintPolicy: 'OnFirstFittingMachine',
      },
      engine: {
        networkRequestTimeout: 1,
      },
    });

    communication.getAvailableMachines.mockReturnValueOnce([
      { ip: '111.111.111.111', id: 'machine-1' },
      { ip: '123.123.123.123', id: 'machine-2' },
      { ip: '101.101.101.101', id: 'machine-3' },
      { ip: '222.222.222.222', id: 'machine-4' },
    ]);

    network.sendRequest
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  body: JSON.stringify({}),
                }),
              100,
            ),
          ),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  body: JSON.stringify({}),
                }),
              200,
            ),
          ),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  body: JSON.stringify({}),
                }),
              300,
            ),
          ),
      );
    expect(
      await constraintManager.getExternalSoftConstraintValues(
        exampleConstraints.hardConstraints,
        exampleConstraints.softConstraints,
        {},
      ),
    ).toEqual([
      {
        id: 'machine-1',
        ip: '111.111.111.111',
        port: undefined,
        softConstraintValues: {},
      },
    ]);
  });
});

describe('#getLocalSoftConstraintValues', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('no hardConstraints are given', async () => {
    config.readConfig.mockResolvedValue({
      router: {
        waitTimeExternalEvaluations: 1000,
      },
      engine: {
        networkRequestTimeout: 1,
      },
      processes: {
        acceptUserTasks: true,
      },
    });

    expect(await constraintManager.getLocalSoftConstraintValues([], [], {})).toEqual({});
  });
});

describe('#checkExecutionConfig', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('userTasks not accepted', async () => {
    const flowNodeInformation = {
      id: 'flowNode-123',
      isUserTask: true,
    };

    config.readConfig.mockResolvedValue({
      processes: {
        acceptUserTasks: false,
      },
    });

    expect(await constraintManager.checkExecutionConfig(flowNodeInformation)).toEqual(false);
  });

  test('userTasks accepted', async () => {
    const flowNodeInformation = {
      id: 'flowNode-123',
      isUserTask: true,
    };

    config.readConfig.mockResolvedValue({
      processes: {
        acceptUserTasks: true,
      },
    });

    expect(await constraintManager.checkExecutionConfig(flowNodeInformation)).toEqual(true);
  });

  test('process execution deactivated', async () => {
    const flowNodeInformation = {
      id: 'flowNode-123',
      isUserTask: false,
    };

    config.readConfig.mockResolvedValue({
      processes: {
        deactivateProcessExecution: true,
      },
    });

    expect(await constraintManager.checkExecutionConfig(flowNodeInformation)).toEqual(false);
  });

  test('process execution not deactivated', async () => {
    const flowNodeInformation = {
      id: 'flowNode-123',
      isUserTask: false,
    };

    config.readConfig.mockResolvedValue({
      processes: {
        deactivateProcessExecution: false,
      },
    });

    expect(await constraintManager.checkExecutionConfig(flowNodeInformation)).toEqual(true);
  });
});
