const intermediateToFinal = require('../intermediateToFinalJsParser');

const FullConstraintsJSON = require('./FullConstraintsJSON');
const FullConstraintsIntermeditateJSON = require('./FullConstraintsIntermediateJSON');

describe('Conversion tests for smaller parts of fast-xml-parser-output to our JS representation', () => {
  let finalJSON;
  let intermediateJSON;
  beforeEach(() => {
    finalJSON = JSON.parse(JSON.stringify(FullConstraintsJSON));
    intermediateJSON = JSON.parse(JSON.stringify(FullConstraintsIntermeditateJSON));
  });

  describe('test conversion of value', () => {
    test('test if a simple value can be converted', () => {
      const fastXMLValue = 'linux';

      const finalValue = {
        value: 'linux',
        _valueAttributes: {},
      };

      expect(intermediateToFinal.convertValue(fastXMLValue)).toStrictEqual(finalValue);
    });

    test('test if a value object containing its name and attributes can be converted', () => {
      const fastXMLValueObj = {
        '#text': 50,
        _attributes: {
          unit: 'ms',
        },
      };

      const finalValue = {
        value: 50,
        _valueAttributes: { unit: 'ms' },
      };

      expect(intermediateToFinal.convertValue(fastXMLValueObj)).toStrictEqual(finalValue);
    });

    test('test if a boolean value is converted correctly', () => {
      const fastXMLValue = true;

      const finalValue = {
        value: true,
        _valueAttributes: {},
      };

      expect(intermediateToFinal.convertValue(fastXMLValue)).toStrictEqual(finalValue);
    });
  });

  describe('test conversion of values', () => {
    test('test if values with a single value gets correctly converted', () => {
      const fastXMLValues = {
        values: {
          value: 'ubuntu',
        },
      };

      const finalValues = {
        values: [{ value: 'ubuntu', _valueAttributes: {} }],
        _valuesAttributes: {},
      };

      expect(intermediateToFinal.convertValues(fastXMLValues)).toStrictEqual(finalValues);
    });

    test('test if values with an attribute and multiple value gets correctly converted', () => {
      const fastXMLValues = {
        values: {
          _attributes: {
            conjunction: 'AND',
          },
          value: ['Touch', 'Keyboard'],
        },
      };

      const finalValues = {
        values: [
          { value: 'Touch', _valueAttributes: {} },
          { value: 'Keyboard', _valueAttributes: {} },
        ],
        _valuesAttributes: {
          conjunction: 'AND',
        },
      };

      expect(intermediateToFinal.convertValues(fastXMLValues)).toStrictEqual(finalValues);
    });
  });

  describe('test conversion of condition', () => {
    test('test if a condition containing a less than or greater than entity reference is converted to a less than', () => {
      expect(intermediateToFinal.convertCondition('&lt;')).toBe('<');

      expect(intermediateToFinal.convertCondition('&gt;')).toBe('>');

      expect(intermediateToFinal.convertCondition('&lt;=')).toBe('<=');

      expect(intermediateToFinal.convertCondition('&gt;=')).toBe('>=');
    });
  });

  describe('test conversion of softConstraint', () => {
    test('test if a softConstraint containing no attributes is converted correctly', () => {
      const fastXMLSC = {
        name: 'machine.cpu.currentLoad',
        condition: 'min',
      };

      const finalSC = {
        _type: 'softConstraint',
        _attributes: {},
        name: 'machine.cpu.currentLoad',
        condition: 'min',
      };

      expect(intermediateToFinal.convertSoftConstraint(fastXMLSC)).toStrictEqual(finalSC);
    });
  });

  describe('test conversion of softConstraints', () => {
    test('test if a softConstraints element containing a softConstraint element is converted correctly', () => {
      const fastXMLSC = {
        softConstraint: {
          _attributes: {
            weight: 8,
          },
          name: 'machine.mem.free',
          condition: 'max',
        },
      };

      const finalSC = [
        {
          _type: 'softConstraint',
          _attributes: {
            weight: 8,
          },
          name: 'machine.mem.free',
          condition: 'max',
        },
      ];

      expect(intermediateToFinal.convertSoftConstraints(fastXMLSC)).toStrictEqual(finalSC);
    });

    test('test if a softConstraints element containing multiple softConstraint elements is converted correctly', () => {
      const fastXMLSC = {
        softConstraint: [
          {
            _attributes: {
              weight: 8,
            },
            name: 'machine.mem.free',
            condition: 'max',
          },
          {
            name: 'machine.cpu.currentLoad',
            condition: 'min',
          },
        ],
      };

      const finalSC = [
        {
          _type: 'softConstraint',
          _attributes: {
            weight: 8,
          },
          name: 'machine.mem.free',
          condition: 'max',
        },
        {
          _type: 'softConstraint',
          _attributes: {},
          name: 'machine.cpu.currentLoad',
          condition: 'min',
        },
      ];

      expect(intermediateToFinal.convertSoftConstraints(fastXMLSC)).toStrictEqual(finalSC);
    });

    test('test if empty softConstraints element results in null being returned', () => {
      const fastXML = {};

      expect(intermediateToFinal.convertSoftConstraints(fastXML)).toBe(null);
    });
  });

  describe('test conversion of constraintGroupRef', () => {
    test('test if a simle constraintGroupRef element is converted correctly', () => {
      const fastXMLCGR = {
        _attributes: {
          ref: 'g1',
        },
      };

      const finalCGR = {
        _type: 'constraintGroupRef',
        _attributes: {
          ref: 'g1',
        },
      };

      expect(intermediateToFinal.convertConstraintGroupRef(fastXMLCGR)).toStrictEqual(finalCGR);
    });
  });

  describe('test conversion of hardConstraint', () => {
    test('test if a simple hardConstraint is converted correctly', () => {
      const fastXMLHC = {
        name: 'machine.os.platform',
        condition: '==',
        values: {
          value: 'linux',
        },
      };

      const finalHC = {
        _type: 'hardConstraint',
        _attributes: {},
        name: 'machine.os.platform',
        condition: '==',
        values: [{ value: 'linux', _valueAttributes: {} }],
        _valuesAttributes: {},
      };

      expect(intermediateToFinal.convertHardConstraint(fastXMLHC)).toStrictEqual(finalHC);
    });

    test('test if a hardConstraint containing a hardConstraintsElement is converted correctly', () => {
      const fastXMLHC = intermediateJSON.processConstraints.hardConstraints.hardConstraint[2];

      const finalHC = finalJSON.processConstraints.hardConstraints[2];

      expect(intermediateToFinal.convertHardConstraint(fastXMLHC)).toStrictEqual(finalHC);
    });
  });

  describe('test if a constraintGroup is converted correctly', () => {
    test('test if a constraintGroup containing multiple hardConstraint elements is converted corretly', () => {
      const fastXMLCG = intermediateJSON.processConstraints.hardConstraints.constraintGroup[0];

      const finalXMLCG = finalJSON.processConstraints.hardConstraints[3];

      expect(intermediateToFinal.convertConstraintGroup(fastXMLCG)).toStrictEqual(finalXMLCG);
    });

    test('test if a constraintGroup containing multiple constraintGroupRef elements is converted correctly', () => {
      const fastXMLCG = intermediateJSON.processConstraints.hardConstraints.constraintGroup[2];

      const finalXMLCG = finalJSON.processConstraints.hardConstraints[5];

      expect(intermediateToFinal.convertConstraintGroup(fastXMLCG)).toStrictEqual(finalXMLCG);
    });
  });

  describe('test if a hardConstraints element is converted correctly', () => {
    test('test if a hardConstraints Element containing a single hardConstraint Element is converted correctly', () => {
      const fastXMLHC = {
        hardConstraint: {
          name: 'machine.os.platform',
          condition: '==',
          values: {
            value: 'linux',
          },
        },
      };

      const finalHC = [
        {
          _type: 'hardConstraint',
          _attributes: {},
          name: 'machine.os.platform',
          condition: '==',
          values: [{ value: 'linux', _valueAttributes: {} }],
          _valuesAttributes: {},
        },
      ];

      expect(intermediateToFinal.convertHardConstraints(fastXMLHC)).toStrictEqual(finalHC);
    });

    test('test if a hardConstraints Element containing multiple hardConstraint Elements is converted correctly', () => {
      const fastXMLHC = {
        hardConstraint: [
          {
            name: 'machine.os.platform',
            condition: '==',
            values: {
              value: 'linux',
            },
          },
          {
            name: 'machine.inputs',
            condition: '==',
            values: {
              _attributes: {
                conjunction: 'AND',
              },
              value: ['Touch', 'Keyboard'],
            },
          },
        ],
      };

      const finalHC = [
        {
          _type: 'hardConstraint',
          _attributes: {},
          name: 'machine.os.platform',
          condition: '==',
          values: [{ value: 'linux', _valueAttributes: {} }],
          _valuesAttributes: {},
        },
        {
          _type: 'hardConstraint',
          _attributes: {},
          name: 'machine.inputs',
          condition: '==',
          values: [
            { value: 'Touch', _valueAttributes: {} },
            { value: 'Keyboard', _valueAttributes: {} },
          ],
          _valuesAttributes: {
            conjunction: 'AND',
          },
        },
      ];

      expect(intermediateToFinal.convertHardConstraints(fastXMLHC)).toStrictEqual(finalHC);
    });

    test('test if a hardConstraints element containing a single constraintGroup is converted correctly', () => {
      const fastXMLHC = {
        constraintGroup: intermediateJSON.processConstraints.hardConstraints.constraintGroup[0],
      };

      const finalHC = [finalJSON.processConstraints.hardConstraints[3]];

      expect(intermediateToFinal.convertHardConstraints(fastXMLHC)).toStrictEqual(finalHC);
    });

    test('test if a hardConstraints Element containing multiple constraintGroup Elements is converted correctly', () => {
      const fastXMLHC = {
        constraintGroup: intermediateJSON.processConstraints.hardConstraints.constraintGroup,
      };

      const finalHC = finalJSON.processConstraints.hardConstraints.slice(3);

      expect(intermediateToFinal.convertHardConstraints(fastXMLHC)).toStrictEqual(finalHC);
    });

    test('test if empty hardConstraints element results in null being returned', () => {
      const fastXML = {};

      expect(intermediateToFinal.convertHardConstraints(fastXML)).toBe(null);
    });
  });

  describe('test if erronous elements result in errors being thrown', () => {
    test('test if a missing processConstraints element results in an error being thrown', () => {
      const fastXML = {};

      expect(() => {
        intermediateToFinal.convertConstraints(fastXML);
      }).toThrowError("Constraint doesn't contain ProcessConstraints element");
    });

    test('test if constraintGroup element not containing an id attribute results in an error bein thrown', () => {
      const fastXMLCG = intermediateJSON.processConstraints.hardConstraints.constraintGroup[0];
      delete fastXMLCG._attributes.id;

      expect(() => {
        intermediateToFinal.convertConstraintGroup(fastXMLCG);
      }).toThrowError('ConstraintGroup with missing id found.');
    });

    test('test if a constraintGroupRef element not containing a ref attribute results in an error being thrown', () => {
      const fastXMLCGR = {
        _attributes: {},
      };

      expect(() => {
        intermediateToFinal.convertConstraintGroupRef(fastXMLCGR);
      }).toThrowError('ConstraintGroupRef element without ref attribute found.');
    });

    test('test if hardConstraint element not containing a name or condition results in an error', () => {
      const fastXML = {};

      expect(() => {
        intermediateToFinal.convertHardConstraint(fastXML);
      }).toThrowError('Missing information in hardConstraint: name, condition');
    });

    test('test if softConstraint element not containing a name or condition results in an error', () => {
      const fastXML = {};

      expect(() => {
        intermediateToFinal.convertSoftConstraint(fastXML);
      }).toThrowError('Missing information in softConstraint: name, condition');
    });
  });

  describe('test if malformed elements are handled correctly', () => {
    intermediateToFinal.logger = {
      debug: jest.fn(),
    };
    test('test if empty softConstraints and hardConstraints elements are handled correctly', () => {
      const fastPC = { softConstraints: {}, hardConstraints: {} };

      expect(intermediateToFinal.convertProcessConstraints(fastPC)).toEqual({});
    });
  });
});
