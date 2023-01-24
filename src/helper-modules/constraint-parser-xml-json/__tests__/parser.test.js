const fs = require('fs');

const Parser = require('../parser');

const fullConstraintsJSON = require('./FullConstraintsJSON');
const constraintsJSON1 = require('./ConstraintsJSON/1-ConstraintsJSON');
const processJSON1 = require('./ConstraintsJSON/1-ProcessJSON');
const processJSON2 = require('./ConstraintsJSON/2-ProcessJSON');
const concatenationJSON2 = require('./ConstraintsJSON/2-ConcatenationJSON');
const concatenationJSON3 = require('./ConstraintsJSON/3-ConcatenationJSON');
const constraintGroupANDJSON = require('./ConstraintsJSON/AND-ConstraintGroupJSON');
const constraintGroupORJSON = require('./ConstraintsJSON/OR-ConstraintGroupJSON');

const maxMachineHopsConstraintJSON = require('./ConstraintsJSON/maxMachineHopsConstraintJSON');
const maxTimeConstraintJSON = require('./ConstraintsJSON/maxTimeConstraintJSON');
const maxTimeGlobalConstraintJSON = require('./ConstraintsJSON/maxTimeGlobalConstraintJSON');
const maxTokenStorageRoundsConstraintJSON = require('./ConstraintsJSON/maxTokenStorageRoundsConstraintJSON');
const maxTokenStorageTimeConstraintJSON = require('./ConstraintsJSON/maxTokenStorageTimeConstraintJSON');
const sameMachineConstraint1JSON = require('./ConstraintsJSON/sameMachineConstraint1JSON');
const sameMachineConstraint2JSON = require('./ConstraintsJSON/sameMachineConstraint2JSON');

const circularGroupsJSON = require('./ConstraintsJSON/CircularGroupsJSON').processConstraints;
const criticalMachineConstraintsJSON =
  require('./ConstraintsJSON/CriticalMachineConstraintsJSON').processConstraints;
const criticalNetworkConstraintsJSON =
  require('./ConstraintsJSON/CriticalNetworkConstraintsJSON').processConstraints;

const removeWhiteSpace = (str) => str.replace(/\s/g, '');

describe('Parsing Tests for the complete XML/JSON constraints examples', () => {
  let fullConstraintsXML = '';
  let constraintsXML1;
  let processXML1;
  let processXML2;
  let concatenationXML2;
  let concatenationXML3;
  let constraintGroupANDXML;
  let constraintGroupORXML;

  let maxMachineHopsConstraintXML;
  let maxTimeConstraintXML;
  let maxTimeGlobalConstraintXML;
  let maxTokenStorageRoundsConstraintXML;
  let maxTokenStorageTimeConstraintXML;
  let sameMachineConstraint1XML;
  let sameMachineConstraint2XML;

  let parser;

  const customLogger = {
    error: jest.fn(() => {
      console.log('Test\n\n\n\n');
    }),
    warn: jest.fn(),
  };

  beforeAll(() => {
    fullConstraintsXML = fs.readFileSync(`${__dirname}/FullConstraintsXML.xml`, 'utf8');
    constraintsXML1 = fs.readFileSync(`${__dirname}/ConstraintsXML/1-ConstraintsXML.xml`, 'utf8');
    processXML1 = fs.readFileSync(`${__dirname}/ConstraintsXML/1-ProcessXML.xml`, 'utf8');
    processXML2 = fs.readFileSync(`${__dirname}/ConstraintsXML/2-ProcessXML.xml`, 'utf8');
    concatenationXML2 = fs.readFileSync(
      `${__dirname}/ConstraintsXML/2-ConcatenationXML.xml`,
      'utf8'
    );
    concatenationXML3 = fs.readFileSync(
      `${__dirname}/ConstraintsXML/3-ConcatenationXML.xml`,
      'utf8'
    );
    constraintGroupANDXML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/AND-ConstraintGroupXML.xml`,
      'utf8'
    );
    constraintGroupORXML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/OR-ConstraintGroupXML.xml`,
      'utf8'
    );

    maxMachineHopsConstraintXML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/maxMachineHopsConstraintXML.xml`,
      'utf8'
    );
    maxTimeConstraintXML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/maxTimeConstraintXML.xml`,
      'utf8'
    );
    maxTimeGlobalConstraintXML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/maxTimeGlobalConstraintXML.xml`,
      'utf8'
    );
    maxTokenStorageRoundsConstraintXML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/maxTokenStorageRoundsConstraintXML.xml`,
      'utf8'
    );
    maxTokenStorageTimeConstraintXML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/maxTokenStorageTimeConstraintXML.xml`,
      'utf8'
    );
    sameMachineConstraint1XML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/sameMachineConstraint1XML.xml`,
      'utf8'
    );
    sameMachineConstraint2XML = fs.readFileSync(
      `${__dirname}/ConstraintsXML/sameMachineConstraint2XML.xml`,
      'utf8'
    );
  });

  beforeEach(() => {
    parser = new Parser();
    jest.resetAllMocks();
  });

  test('test if a simple js object parses to XML', () => {
    parser.setLogger(customLogger);
    expect(parser.fromJsToXml({ test: true })).toBe('');
    expect(customLogger.error).toHaveBeenCalledTimes(1);
    expect(parser.logger.error).toHaveBeenCalledWith(
      'Root element has no member called processConstraints'
    );
  });

  test('test if the XML can be parsed to JSON', () => {
    expect(JSON.parse(parser.fromXmlToJson(fullConstraintsXML))).toStrictEqual(fullConstraintsJSON);
    expect(JSON.parse(parser.fromXmlToJson(constraintsXML1))).toStrictEqual(constraintsJSON1);
    expect(JSON.parse(parser.fromXmlToJson(processXML1))).toStrictEqual(processJSON1);
    expect(JSON.parse(parser.fromXmlToJson(processXML2))).toStrictEqual(processJSON2);
    expect(JSON.parse(parser.fromXmlToJson(concatenationXML2))).toStrictEqual(concatenationJSON2);
    expect(JSON.parse(parser.fromXmlToJson(concatenationXML3))).toStrictEqual(concatenationJSON3);
    expect(JSON.parse(parser.fromXmlToJson(constraintGroupANDXML))).toStrictEqual(
      constraintGroupANDJSON
    );
    expect(JSON.parse(parser.fromXmlToJson(constraintGroupORXML))).toStrictEqual(
      constraintGroupORJSON
    );
    expect(JSON.parse(parser.fromXmlToJson(maxMachineHopsConstraintXML))).toStrictEqual(
      maxMachineHopsConstraintJSON
    );
    expect(JSON.parse(parser.fromXmlToJson(maxTimeConstraintXML))).toStrictEqual(
      maxTimeConstraintJSON
    );
    expect(JSON.parse(parser.fromXmlToJson(maxTimeGlobalConstraintXML))).toStrictEqual(
      maxTimeGlobalConstraintJSON
    );
    expect(JSON.parse(parser.fromXmlToJson(maxTokenStorageRoundsConstraintXML))).toStrictEqual(
      maxTokenStorageRoundsConstraintJSON
    );
    expect(JSON.parse(parser.fromXmlToJson(maxTokenStorageTimeConstraintXML))).toStrictEqual(
      maxTokenStorageTimeConstraintJSON
    );
    expect(JSON.parse(parser.fromXmlToJson(sameMachineConstraint1XML))).toStrictEqual(
      sameMachineConstraint1JSON
    );
    expect(JSON.parse(parser.fromXmlToJson(sameMachineConstraint2XML))).toStrictEqual(
      sameMachineConstraint2JSON
    );
    expect(JSON.parse(parser.fromXmlToJson(concatenationXML3))).toStrictEqual(concatenationJSON3);
  });

  test('test if the JSON can be parsed to XML', () => {
    let unformattedParsedXml = removeWhiteSpace(parser.fromJsonToXml(fullConstraintsJSON));
    let unformattedExampleXml = removeWhiteSpace(fullConstraintsXML);
    expect(unformattedParsedXml).toBe(unformattedExampleXml);

    unformattedParsedXml = removeWhiteSpace(parser.fromJsonToXml(sameMachineConstraint1JSON));
    unformattedExampleXml = removeWhiteSpace(sameMachineConstraint1XML);
    expect(unformattedParsedXml).toBe(unformattedExampleXml);

    unformattedParsedXml = removeWhiteSpace(parser.fromJsonToXml(sameMachineConstraint2JSON));
    unformattedExampleXml = removeWhiteSpace(sameMachineConstraint2XML);
    expect(unformattedParsedXml).toBe(unformattedExampleXml);
  });
});

describe('#checkConstraintDefinition', () => {
  const parser = new Parser();

  test('no constraints given', () => {
    expect(parser.checkConstraintDefinition()).toStrictEqual({
      warnings: [],
      errors: [],
    });
  });

  describe('#searchForCircularDependencies', () => {
    test('interdependency between 2 groups', () => {
      // g1->g2->g1
      expect(
        parser.searchForCircularDependencies(circularGroupsJSON.hardConstraints, 'g1', [])
      ).toEqual(true);
      expect(
        parser.searchForCircularDependencies(circularGroupsJSON.hardConstraints, 'g2', [])
      ).toEqual(true);
    });

    test('circular dependency between more than 2 groups', () => {
      // g3->g4->g5->g3
      expect(
        parser.searchForCircularDependencies(circularGroupsJSON.hardConstraints, 'g3', [])
      ).toEqual(true);
      expect(
        parser.searchForCircularDependencies(circularGroupsJSON.hardConstraints, 'g4', [])
      ).toEqual(true);
      expect(
        parser.searchForCircularDependencies(circularGroupsJSON.hardConstraints, 'g5', [])
      ).toEqual(true);
    });

    test('no circular dependency', () => {
      // g6->g7
      // g7 doesnt reference other groups
      expect(
        parser.searchForCircularDependencies(circularGroupsJSON.hardConstraints, 'g6', [])
      ).toEqual(false);
      expect(
        parser.searchForCircularDependencies(circularGroupsJSON.hardConstraints, 'g7', [])
      ).toEqual(false);
    });

    expect(parser.checkConstraintDefinition(circularGroupsJSON)).toStrictEqual({
      warnings: [],
      errors: [
        'Circular dependency at constraintGroup g1',
        'Circular dependency at constraintGroup g2',
        'Circular dependency at constraintGroup g3',
        'Circular dependency at constraintGroup g4',
        'Circular dependency at constraintGroup g5',
      ],
    });
  });

  test('rules for machineConstraints', () => {
    expect(
      parser.checkForCriticalConstraintComposition(
        ['machine.id', 'machine.name', 'machine.hostname'],
        criticalMachineConstraintsJSON.hardConstraints
      )
    ).toEqual(true);

    expect(parser.checkConstraintDefinition(criticalMachineConstraintsJSON)).toStrictEqual({
      warnings: [
        'Appearance of machine.id, machine.name and machine.hostname with AND-conjunction',
      ],
      errors: [
        'Multiple values with AND-conjunction for machine.id',
        'Multiple values with AND-conjunction for machine.name in constraintGroup g1',
        'Multiple values with AND-conjunction for machine.hostname in constraintGroup g1',
      ],
    });
  });

  test('rules for networkConstraints', () => {
    expect(
      parser.checkForCriticalConstraintComposition(
        ['machine.network.ip4', 'machine.network.ip6', 'machine.network.mac'],
        criticalNetworkConstraintsJSON.hardConstraints
      )
    ).toEqual(true);

    expect(parser.checkConstraintDefinition(criticalNetworkConstraintsJSON)).toStrictEqual({
      warnings: [
        'Multiple values with AND-conjunction for machine.network.ip4',
        'Multiple values with AND-conjunction for machine.network.ip6 in constraintGroup g1',
        'Multiple values with AND-conjunction for machine.network.mac in constraintGroup g1',
        'Appearance of machine.network.ip4, machine.network.ip6 and machine.network.mac with AND-conjunction',
      ],
      errors: [],
    });
  });
});
