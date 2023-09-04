/* eslint-disable import/no-dynamic-require */
const constraintHelper = require('../constraintHelper');

const path = './../../../../helper-modules/constraint-parser-xml-json/__tests__/ConstraintsJSON/';
const processConstraints1 = require(`${path}1-ProcessJSON.json`).processConstraints;

const flowNodeConstraints1 = require(`${path}1-ConstraintsJSON.json`).processConstraints;

const concatenatedConstraints2 = require(`${path}2-ConcatenationJSON.json`).processConstraints;
const processConstraints2 = require(`${path}2-ProcessJSON.json`).processConstraints;
const flowNodeConstraints2 = require(`${path}1-ConstraintsJSON.json`).processConstraints;

const concatenatedConstraints3 = require(`${path}3-ConcatenationJSON.json`).processConstraints;
const processConstraints3 = require(`${path}AND-ConstraintGroupJSON.json`).processConstraints;
const flowNodeConstraints3 = require(`${path}OR-ConstraintGroupJSON.json`).processConstraints;

describe('#filterOutDuplicateProcessConstraints', () => {
  test('no flowNode and/or process Constraints are given', () => {
    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(
        flowNodeConstraints1.hardConstraints,
        undefined,
      ),
    ).toStrictEqual([]);

    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(
        undefined,
        processConstraints1.hardConstraints,
      ),
    ).toStrictEqual(processConstraints1.hardConstraints);

    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(undefined, undefined),
    ).toStrictEqual([]);
  });

  test('hardconstraint (same key)', () => {
    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(
        flowNodeConstraints1.hardConstraints,
        processConstraints1.hardConstraints,
      ),
    ).toStrictEqual([]);
  });

  test('hardconstraint (different key)', () => {
    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(
        flowNodeConstraints2.hardConstraints,
        processConstraints2.hardConstraints,
      ),
    ).toStrictEqual(processConstraints2.hardConstraints);
  });

  test('softconstraint (same key)', () => {
    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(
        flowNodeConstraints1.softConstraints,
        processConstraints1.softConstraints,
      ),
    ).toStrictEqual([]);
  });

  test('softconstraint (different key)', () => {
    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(
        flowNodeConstraints2.softConstraints,
        processConstraints2.softConstraints,
      ),
    ).toStrictEqual(processConstraints2.softConstraints);
  });

  test('constraintGroup', () => {
    expect(
      constraintHelper.filterOutDuplicateProcessConstraints(
        flowNodeConstraints3.hardConstraints,
        processConstraints3.hardConstraints,
      ),
    ).toStrictEqual(processConstraints3.hardConstraints);
  });
});

describe('#concatAllConstraints', () => {
  test('no flowNode and/or process Constraints are given', () => {
    expect(
      constraintHelper.concatAllConstraints(flowNodeConstraints1.hardConstraints, undefined),
    ).toStrictEqual(flowNodeConstraints1.hardConstraints);

    expect(
      constraintHelper.concatAllConstraints(undefined, processConstraints1.hardConstraints),
    ).toStrictEqual(processConstraints1.hardConstraints);

    expect(constraintHelper.concatAllConstraints(undefined, undefined)).toStrictEqual([]);
  });

  test('hardconstraint (same key)', () => {
    expect(
      constraintHelper.concatAllConstraints(
        flowNodeConstraints1.hardConstraints,
        processConstraints1.hardConstraints,
      ),
    ).toStrictEqual(flowNodeConstraints1.hardConstraints);
  });

  test('hardconstraint (different key)', () => {
    expect(
      constraintHelper.concatAllConstraints(
        flowNodeConstraints2.hardConstraints,
        processConstraints2.hardConstraints,
      ),
    ).toStrictEqual(concatenatedConstraints2.hardConstraints);
  });

  test('softconstraint (same key)', () => {
    expect(
      constraintHelper.concatAllConstraints(
        flowNodeConstraints1.softConstraints,
        processConstraints1.softConstraints,
      ),
    ).toStrictEqual(flowNodeConstraints1.softConstraints);
  });

  test('softconstraint (different key)', () => {
    expect(
      constraintHelper.concatAllConstraints(
        flowNodeConstraints2.softConstraints,
        processConstraints2.softConstraints,
      ),
    ).toStrictEqual(concatenatedConstraints2.softConstraints);
  });

  test('constraintGroup', () => {
    expect(
      constraintHelper.concatAllConstraints(
        flowNodeConstraints3.hardConstraints,
        processConstraints3.hardConstraints,
      ),
    ).toStrictEqual(concatenatedConstraints3.hardConstraints);
  });
});
