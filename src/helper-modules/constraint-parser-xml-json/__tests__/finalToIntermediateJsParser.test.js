const finalToIntermediate = require('../finalToIntermediateJsParser');

const FullConstraintsJSON = require('./FullConstraintsJSON');
const FullConstraintsIntermeditateJSON = require('./FullConstraintsIntermediateNamespacedJSON');

describe('Conversion tests for smaller parts of our JS representation to fast-xml-parser input', () => {
  let finalJSON;
  let intermediateJSON;
  finalToIntermediate.logger = {
    debug: jest.fn(),
  };

  beforeEach(() => {
    finalJSON = JSON.parse(JSON.stringify(FullConstraintsJSON));
    intermediateJSON = JSON.parse(JSON.stringify(FullConstraintsIntermeditateJSON));
    finalToIntermediate.logger.debug.mockClear();
  });

  describe('test filtering of _attributes', () => {
    const finalAttr = {
      weight: '10',
      conjunction: null,
      unit: null,
      ref: 'ab',
    };

    const fastXMLAttr = {
      weight: '10',
      ref: 'ab',
    };

    expect(finalToIntermediate.filterAttributes(finalAttr)).toStrictEqual(fastXMLAttr);
    expect(finalToIntermediate.logger.debug).toHaveBeenNthCalledWith(
      1,
      'Found attribute conjunction with value null. Omitting from output.'
    );
    expect(finalToIntermediate.logger.debug).toHaveBeenNthCalledWith(
      2,
      'Found attribute unit with value null. Omitting from output.'
    );
  });

  describe('test conversion of value', () => {
    test('test if a simple value can be converted to a string', () => {
      const fastXMLValue = 'linux';

      const finalValue = {
        value: 'linux',
        _valueAttributes: {},
      };

      expect(finalToIntermediate.convertValue(finalValue)).toStrictEqual(fastXMLValue);
    });

    test('test if a value object containing its name and attributes can be converted', () => {
      const fastXMLValue = {
        '#text': '50',
        _attributes: {
          unit: 'ms',
        },
      };

      const finalValue = {
        value: '50',
        _valueAttributes: { unit: 'ms' },
      };

      expect(finalToIntermediate.convertValue(finalValue)).toStrictEqual(fastXMLValue);
    });
  });

  describe('test conversion of values', () => {
    test('test if values with a single value gets correctly converted', () => {
      const fastXMLValues = {
        'proceed:values': {
          'proceed:value': 'ubuntu',
        },
      };

      const finalValues = {
        values: [{ value: 'ubuntu', _valueAttributes: {} }],
        _valuesAttributes: {},
      };

      expect(finalToIntermediate.convertValues(finalValues)).toStrictEqual(fastXMLValues);
    });

    test('test if values with an attribute and multiple value gets correctly converted', () => {
      const fastXMLValues = {
        'proceed:values': {
          _attributes: {
            conjunction: 'AND',
          },
          'proceed:value': ['Touch', 'Keyboard'],
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

      expect(finalToIntermediate.convertValues(finalValues)).toStrictEqual(fastXMLValues);
    });
  });

  describe('test conversion of condition', () => {
    test('test if a condition containing a less than or greater than is converted to a less than or greater than entity reference', () => {
      expect(finalToIntermediate.convertCondition('<')).toBe('&lt;');

      expect(finalToIntermediate.convertCondition('>')).toBe('&gt;');

      expect(finalToIntermediate.convertCondition('<=')).toBe('&lt;=');

      expect(finalToIntermediate.convertCondition('>=')).toBe('&gt;=');
    });
  });

  describe('test conversion of softConstraint', () => {
    test('test if a softConstraint containing no attributes is converted correctly', () => {
      const fastXMLSC = {
        'proceed:name': 'machine.cpu.currentLoad',
        'proceed:condition': 'min',
      };

      const finalSC = {
        _type: 'softConstraint',
        _attributes: {},
        name: 'machine.cpu.currentLoad',
        condition: 'min',
      };

      expect(finalToIntermediate.convertSoftConstraint(finalSC)).toStrictEqual(fastXMLSC);
    });
  });

  describe('test conversion of softConstraints', () => {
    test('test if a softConstraints element containing a softConstraint element is converted correctly', () => {
      const fastXMLSC = {
        'proceed:softConstraint': {
          _attributes: {
            weight: 8,
          },
          'proceed:name': 'machine.mem.free',
          'proceed:condition': 'max',
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

      expect(finalToIntermediate.convertSoftConstraints(finalSC)).toStrictEqual(fastXMLSC);
    });

    test('test if a softConstraints element containing multiple softConstraint elements is converted correctly', () => {
      const fastXMLSC = {
        'proceed:softConstraint': [
          {
            _attributes: {
              weight: 8,
            },
            'proceed:name': 'machine.mem.free',
            'proceed:condition': 'max',
          },
          {
            'proceed:name': 'machine.cpu.currentLoad',
            'proceed:condition': 'min',
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

      expect(finalToIntermediate.convertSoftConstraints(finalSC)).toStrictEqual(fastXMLSC);
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

      expect(finalToIntermediate.convertConstraintGroupRef(finalCGR)).toStrictEqual(fastXMLCGR);
    });
  });

  describe('test conversion of hardConstraint', () => {
    test('test if a simple hardConstraint is converted correctly', () => {
      const fastXMLHC = {
        'proceed:name': 'machine.os.platform',
        'proceed:condition': '==',
        'proceed:values': {
          'proceed:value': 'linux',
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

      expect(finalToIntermediate.convertHardConstraint(finalHC)).toStrictEqual(fastXMLHC);
    });

    test('test if a hardConstraint containing a hardConstraintsElement is converted correctly', () => {
      const fastXMLHC =
        intermediateJSON['proceed:processConstraints']['proceed:hardConstraints'][
          'proceed:hardConstraint'
        ][2];

      const finalHC = finalJSON.processConstraints.hardConstraints[2];

      expect(finalToIntermediate.convertHardConstraint(finalHC)).toStrictEqual(fastXMLHC);
    });
  });

  describe('test if a constraintGroup is converted correctly', () => {
    test('test if a constraintGroup containing multiple hardConstraint elements is converted corretly', () => {
      const fastXMLCG =
        intermediateJSON['proceed:processConstraints']['proceed:hardConstraints'][
          'proceed:constraintGroup'
        ][0];

      const finalCG = finalJSON.processConstraints.hardConstraints[3];

      expect(finalToIntermediate.convertConstraintGroup(finalCG)).toStrictEqual(fastXMLCG);
    });

    test('test if a constraintGroup containing multiple constraintGroupRef elements is converted correctly', () => {
      const fastXMLCG =
        intermediateJSON['proceed:processConstraints']['proceed:hardConstraints'][
          'proceed:constraintGroup'
        ][2];

      const finalCG = finalJSON.processConstraints.hardConstraints[5];

      expect(finalToIntermediate.convertConstraintGroup(finalCG)).toStrictEqual(fastXMLCG);
    });
  });

  describe('test if a hardConstraints element is converted correctly', () => {
    test('test if a hardConstraints Element containing a single hardConstraint Element is converted correctly', () => {
      const fastXMLHC = {
        'proceed:hardConstraint': {
          'proceed:name': 'machine.os.platform',
          'proceed:condition': '==',
          'proceed:values': {
            'proceed:value': 'linux',
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

      expect(finalToIntermediate.convertHardConstraints(finalHC)).toStrictEqual(fastXMLHC);
    });

    test('test if a hardConstraints Element containing multiple hardConstraint Elements is converted correctly', () => {
      const fastXMLHC = {
        'proceed:hardConstraint': [
          {
            'proceed:name': 'machine.os.platform',
            'proceed:condition': '==',
            'proceed:values': {
              'proceed:value': 'linux',
            },
          },
          {
            'proceed:name': 'machine.inputs',
            'proceed:condition': '==',
            'proceed:values': {
              _attributes: {
                conjunction: 'AND',
              },
              'proceed:value': ['Touch', 'Keyboard'],
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

      expect(finalToIntermediate.convertHardConstraints(finalHC)).toStrictEqual(fastXMLHC);
    });

    test('test if a hardConstraints element containing a single constraintGroup is converted correctly', () => {
      const fastXMLHC = {
        'proceed:constraintGroup':
          intermediateJSON['proceed:processConstraints']['proceed:hardConstraints'][
            'proceed:constraintGroup'
          ][0],
      };

      const finalHC = [finalJSON.processConstraints.hardConstraints[3]];

      expect(finalToIntermediate.convertHardConstraints(finalHC)).toStrictEqual(fastXMLHC);
    });

    test('test if a hardConstraints Element containing multiple constraintGroup Elements is converted correctly', () => {
      const fastXMLHC = {
        'proceed:constraintGroup':
          intermediateJSON['proceed:processConstraints']['proceed:hardConstraints'][
            'proceed:constraintGroup'
          ],
      };

      const finalHC = finalJSON.processConstraints.hardConstraints.slice(3);

      expect(finalToIntermediate.convertHardConstraints(finalHC)).toStrictEqual(fastXMLHC);
    });
  });

  test('test if missing hardConstraints or processConstraints in processConstraints are handled correctly', () => {
    const convertHardConstraints = jest.spyOn(finalToIntermediate, 'convertHardConstraints');
    const convertSoftConstraints = jest.spyOn(finalToIntermediate, 'convertSoftConstraints');

    const final = {};
    const intermediate = {};

    expect(finalToIntermediate.convertProcessConstraints(final)).toStrictEqual(intermediate);
    expect(convertHardConstraints).toHaveBeenCalledTimes(0);
    expect(convertSoftConstraints).toHaveBeenCalledTimes(0);
  });

  describe('test if erronous elements lead to errors being thrown', () => {
    test('test if a missing processConstraints element results in an error being thrown', () => {
      const final = {};

      expect(() => {
        finalToIntermediate.convertConstraints(final);
      }).toThrowError('Root element has no member called processConstraints');
    });

    test('test if processConstraints not being an object results in an error being thrown', () => {
      const final = { processConstraints: [] };

      expect(() => {
        finalToIntermediate.convertConstraints(final);
      }).toThrowError('Expected processConstraints to be an object but is array instead');
    });

    test('test if missing ref attribute in constraintGroupRef leads to an error being thrown', () => {
      const finalCGR = {
        _type: 'constraintGroupRef',
        _attributes: {},
      };

      expect(() => {
        finalToIntermediate.convertConstraintGroupRef(finalCGR);
      }).toThrowError('ConstrainGroupRef element without valid ref attribute found.');
    });

    test('test if missing id attribute in constraintGroup leads to an error being thrown', () => {
      const finalCG = finalJSON.processConstraints.hardConstraints[5];
      delete finalCG._attributes.id;

      expect(() => {
        finalToIntermediate.convertConstraintGroup(finalCG);
      }).toThrowError('ConstraintGroup element without valid id attribute found.');
    });
  });

  describe('test if malformed elements lead to corrections and warnings being logged', () => {
    test('test if convertProcessConstraints logs warnings and does not save empty hardConstraints or softConstraints', () => {
      const finalPC = { hardConstraints: [], softConstraints: [] };

      expect(finalToIntermediate.convertProcessConstraints(finalPC)).toEqual({});
    });
  });
});
