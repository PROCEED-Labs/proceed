/* eslint-disable import/no-dynamic-require */
const Sceval = require('../soft_constraint_evaluation/sc-eval.js');

const path = './../../../../helper-modules/constraint-parser-xml-json/__tests__/ConstraintsJSON/';

const test1Input = require(`${path}1-ConstraintsJSON.json`).processConstraints;
const test2Input = require(`${path}2-ProcessJSON.json`).processConstraints;
const test3Input = require(`${path}2-ConcatenationJSON.json`).processConstraints;
const test4Input = require(`${path}CompleteEvaluationConstraintsJSON.json`).processConstraints;

jest.mock('@proceed/machine', () => ({
  information: {
    getMachineInformation: jest.fn(),
  },
}));

describe('#evaluateEveryMachine', () => {
  test('no softconstraints given', () => {
    const valueList = [
      {
        id: 'machine1',
        softConstraintValues: {},
      },
      {
        id: 'machine2',
        softConstraintValues: {},
      },
      {
        id: 'machine3',
        softConstraintValues: {},
      },
    ];

    const result = valueList.map((machine) => ({
      id: machine.id,
    }));

    expect(Sceval.evaluateEveryMachine([], valueList)).toEqual(result);
  });

  test('single softconstraint (max)', () => {
    const machineMemFree = 'machine.mem.free';
    const valueList = [
      {
        id: 'machine1',
        softConstraintValues: {
          [machineMemFree]: 20,
        },
      },
      {
        id: 'machine2',
        softConstraintValues: {
          [machineMemFree]: 50,
        },
      },
      {
        id: 'machine3',
        softConstraintValues: {
          [machineMemFree]: 60,
        },
      },
    ];

    const sortedList = [valueList[2], valueList[1], valueList[0]].map((machine) => ({
      id: machine.id,
    }));

    expect(Sceval.evaluateEveryMachine(test1Input.softConstraints, valueList)).toEqual(sortedList);
  });

  test('single softconstraint (min)', () => {
    const machineCpuCurrentLoad = 'machine.cpu.currentLoad';
    const valueList = [
      {
        id: 'machine1',
        softConstraintValues: {
          [machineCpuCurrentLoad]: 20,
        },
      },
      {
        id: 'machine2',
        softConstraintValues: {
          [machineCpuCurrentLoad]: 30,
        },
      },
      {
        id: 'machine3',
        softConstraintValues: {
          [machineCpuCurrentLoad]: 60,
        },
      },
    ];

    const sortedList = [valueList[0], valueList[1], valueList[2]].map((machine) => ({
      id: machine.id,
    }));

    expect(Sceval.evaluateEveryMachine(test2Input.softConstraints, valueList)).toEqual(sortedList);
  });

  test('multiple softconstraints', () => {
    const machineMemFree = 'machine.mem.free';
    const machineCpuCurrentLoad = 'machine.cpu.currentLoad';
    const valueList = [
      {
        id: 'machine1',
        softConstraintValues: {
          [machineMemFree]: 20,
          [machineCpuCurrentLoad]: 20,
        },
      },
      {
        id: 'machine2',
        softConstraintValues: {
          [machineMemFree]: 50,
          [machineCpuCurrentLoad]: 30,
        },
      },
      {
        id: 'machine3',
        softConstraintValues: {
          [machineMemFree]: 60,
          [machineCpuCurrentLoad]: 60,
        },
      },
    ];

    const sortedList = [valueList[1], valueList[0], valueList[2]].map((machine) => ({
      id: machine.id,
    }));

    expect(Sceval.evaluateEveryMachine(test3Input.softConstraints, valueList)).toEqual(sortedList);
  });

  test('multiple softconstraints with weights', () => {
    const machineMemFree = 'machine.mem.free';
    const machineCpuCurrentLoad = 'machine.cpu.currentLoad';
    const valueList = [
      {
        id: 'machine1',
        softConstraintValues: {
          [machineMemFree]: 20,
          [machineCpuCurrentLoad]: 20,
        },
      },
      {
        id: 'machine2',
        softConstraintValues: {
          [machineMemFree]: 50,
          [machineCpuCurrentLoad]: 30,
        },
      },
      {
        id: 'machine3',
        softConstraintValues: {
          [machineMemFree]: 60,
          [machineCpuCurrentLoad]: 60,
        },
      },
    ];

    const sortedList = [valueList[0], valueList[1], valueList[2]].map((machine) => ({
      id: machine.id,
    }));

    expect(Sceval.evaluateEveryMachine(test4Input.softConstraints, valueList)).toEqual(sortedList);
  });
});
