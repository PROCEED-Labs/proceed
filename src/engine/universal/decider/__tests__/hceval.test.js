/* eslint-disable import/no-dynamic-require */
const { information } = require('@proceed/machine');
const { truncateSync } = require('fs-extra');
const Hceval = require('../hard_constraint_evaluation/hc-eval.js');

const path = './../../../../helper-modules/constraint-parser-xml-json/__tests__/ConstraintsJSON/';

const fullConstraintsJSON =
  require(`${path}CompleteEvaluationConstraintsJSON.json`).processConstraints;
const constraintGroupAND = require(`${path}AND-ConstraintGroupJSON.json`).processConstraints;
const constraintGroupOR = require(`${path}OR-ConstraintGroupJSON.json`).processConstraints;
const maxMachineHopsConstraint =
  require(`${path}maxMachineHopsConstraintJSON.json`).processConstraints;
const maxTimeConstraint = require(`${path}maxTimeConstraintJSON.json`).processConstraints;
const maxTimeGlobalConstraint =
  require(`${path}maxTimeGlobalConstraintJSON.json`).processConstraints;
const maxTokenStorageTimeConstraint =
  require(`${path}maxTokenStorageTimeConstraintJSON.json`).processConstraints;
const maxTokenStorageRoundsConstraint =
  require(`${path}maxTokenStorageRoundsConstraintJSON.json`).processConstraints;
const networkConstraint =
  require('./data/ConstraintsJSON/networkConstraint.json').processConstraints;

jest.mock('@proceed/machine', () => ({
  information: {
    getMachineInformation: jest.fn(),
  },
}));

describe('HardConstraintEvaluator', () => {
  beforeAll(() => {
    information.getMachineInformation = jest.fn();
  });

  describe('#evaluateExecutionConstraints', () => {
    test('machineHops', () => {
      // constraint: maxMachineHops == 2
      const infos = {
        machineHops: 1,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxMachineHopsConstraint.hardConstraints, infos)
      ).toHaveLength(0);

      const infos2 = {
        machineHops: 2,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxMachineHopsConstraint.hardConstraints, infos2)
      ).toHaveLength(0);

      const infos3 = {
        machineHops: 3,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxMachineHopsConstraint.hardConstraints, infos3)
      ).toHaveLength(1);
    });

    test('maxTime', () => {
      // constraint: maxTime == 2000
      const infos = {
        time: 1999,
      };

      expect(
        Hceval.evaluateExecutionConstraints(maxTimeConstraint.hardConstraints, infos)
      ).toHaveLength(0);

      const infos2 = {
        time: 2000,
      };

      expect(
        Hceval.evaluateExecutionConstraints(maxTimeConstraint.hardConstraints, infos2)
      ).toHaveLength(0);

      const infos3 = {
        time: 2001,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTimeConstraint.hardConstraints, infos3)
      ).toHaveLength(1);
    });

    test('maxTimeGlobal', () => {
      // constraint: maxTimeGlobal == 60000  -> 1 minute
      Date.now = jest.fn().mockReturnValue(new Date('2020-03-13T11:21:00'));
      const infos = {
        timeGlobal: 59999,
      };

      expect(
        Hceval.evaluateExecutionConstraints(maxTimeGlobalConstraint.hardConstraints, infos)
      ).toHaveLength(0);

      const infos2 = {
        timeGlobal: 60000,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTimeGlobalConstraint.hardConstraints, infos2)
      ).toHaveLength(0);

      const infos3 = {
        timeGlobal: 60001,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTimeGlobalConstraint.hardConstraints, infos3)
      ).toHaveLength(1);
    });

    test('maxTokenStorageTime', () => {
      const infos = {
        storageTime: 999,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTokenStorageTimeConstraint.hardConstraints, infos)
      ).toHaveLength(0);

      const infos2 = {
        storageTime: 1000,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTokenStorageTimeConstraint.hardConstraints, infos2)
      ).toHaveLength(0);

      const infos3 = {
        storageTime: 1001,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTokenStorageTimeConstraint.hardConstraints, infos3)
      ).toHaveLength(1);
    });

    test('maxTokenStorageRounds', () => {
      const infos = {
        storageRounds: 4,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTokenStorageRoundsConstraint.hardConstraints, infos)
      ).toHaveLength(0);

      const infos2 = {
        storageRounds: 5,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTokenStorageRoundsConstraint.hardConstraints, infos2)
      ).toHaveLength(0);

      const infos3 = {
        storageRounds: 6,
      };
      expect(
        Hceval.evaluateExecutionConstraints(maxTokenStorageRoundsConstraint.hardConstraints, infos3)
      ).toHaveLength(1);
    });
  });

  describe('#evaluateHardConstraint', () => {
    test('hardconstraint with single value', () => {
      const infos = {};
      infos['machine.os.platform'] = 'linux';
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[0], infos)).toEqual(
        true
      );

      infos['machine.os.platform'] = 'windows';
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[0], infos)).toEqual(
        false
      );
    });

    test('hardconstraint with multiple values [conjunction: AND]', () => {
      const infos = {};
      infos['machine.inputs'] = ['Keyboard', 'Touch'];
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[1], infos)).toEqual(
        true
      );

      infos['machine.inputs'] = ['Keyboard', 'Mouse'];
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[1], infos)).toEqual(
        false
      );
    });

    test('hardconstraint with multiple values [conjunction: OR]', () => {
      const infos = {};
      infos['machine.inputs'] = ['Touch'];
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[2], infos)).toEqual(
        true
      );

      infos['machine.inputs'] = ['Mouse'];
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[2], infos)).toEqual(
        false
      );
    });

    test('nested constraint with single value', () => {
      const infos = {};
      infos['machine.possibleConnectionTo==google_de.latency'] = 49;
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[3], infos)).toEqual(
        true
      );

      infos['machine.possibleConnectionTo==google_de.latency'] = 51;
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[3], infos)).toEqual(
        false
      );
    });

    test('nested constraint with multiple values', () => {
      const infos = {};
      infos['machine.possibleConnectionTo==google_de.latency'] = 49;
      infos['machine.possibleConnectionTo==yahoo_de.latency'] = 49;
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[4], infos)).toEqual(
        true
      );

      infos['machine.possibleConnectionTo==google_de.latency'] = 51;
      infos['machine.possibleConnectionTo==yahoo_de.latency'] = 51;
      expect(Hceval.evaluateHardConstraint(fullConstraintsJSON.hardConstraints[4], infos)).toEqual(
        false
      );
    });
  });

  describe('#evaluateAllConstraintGroups', () => {
    test('constraintgroup [conjunction: AND]', () => {
      const infos = {};
      infos['machine.os.platform'] = 'linux';
      infos['machine.os.distro'] = 'Ubuntu';
      expect(Hceval.evaluateAllConstraintGroups(constraintGroupAND.hardConstraints, infos)).toEqual(
        true
      );

      infos['machine.os.platform'] = 'linux';
      infos['machine.os.distro'] = 'Kubuntu';
      expect(Hceval.evaluateAllConstraintGroups(constraintGroupAND.hardConstraints, infos)).toEqual(
        false
      );
    });

    test('constraintgroup [conjunction: OR]', () => {
      const infos = {};
      infos['machine.os.platform'] = 'linux';
      infos['machine.os.distro'] = 'Kubuntu';
      expect(Hceval.evaluateAllConstraintGroups(constraintGroupOR.hardConstraints, infos)).toEqual(
        true
      );

      infos['machine.os.platform'] = 'windows';
      infos['machine.os.distro'] = 'Windows10';
      expect(Hceval.evaluateAllConstraintGroups(constraintGroupOR.hardConstraints, infos)).toEqual(
        false
      );
    });
  });

  test('evaluateAllConstraints', async () => {
    const infos = {};

    infos['machine.os.platform'] = 'linux';
    infos['machine.os.distro'] = 'Ubuntu';
    infos['machine.inputs'] = ['Keyboard', 'Touch'];
    infos['machine.cpu.currentLoad'] = 59;
    infos['machine.possibleConnectionTo==google_de.latency'] = 49;
    infos['machine.possibleConnectionTo==yahoo_de.latency'] = 49;

    expect(await Hceval.evaluateAllConstraints(fullConstraintsJSON.hardConstraints, infos)).toEqual(
      true
    );
  });

  test('getHardConstraintNames', () => {
    expect(Hceval.getHardConstraintNames(fullConstraintsJSON.hardConstraints)).toEqual([
      'machine.os.platform',
      'machine.inputs',
      'machine.possibleConnectionTo==google_de.latency',
      'machine.possibleConnectionTo==yahoo_de.latency',
      'machine.os.distro',
      'machine.cpu.currentLoad',
    ]);
  });

  test('machineSatisfiesAllHardConstraints', async () => {
    const infos = {
      os: {
        platform: 'linux',
        distro: 'Ubuntu',
      },
      inputs: ['Keyboard', 'Touch'],
      cpu: {
        currentLoad: 59,
      },
    };

    infos['possibleConnectionTo==google_de'] = {
      latency: 49,
    };

    infos['possibleConnectionTo==yahoo_de'] = {
      latency: 49,
    };
    information.getMachineInformation.mockReturnValueOnce(infos);
    expect(
      await Hceval.machineSatisfiesAllHardConstraints(fullConstraintsJSON.hardConstraints)
    ).toEqual(true);
  });

  test('machineSatisfiesAllHardConstraints, allows for array as attribute', async () => {
    const infos = {
      network: [
        {
          ip4: '111.111.111.111',
        },
        {
          ip4: '222.222.222.222',
        },
      ],
    };

    information.getMachineInformation.mockReturnValueOnce(infos);
    expect(
      await Hceval.machineSatisfiesAllHardConstraints(networkConstraint.hardConstraints)
    ).toEqual(true);
  });
});
