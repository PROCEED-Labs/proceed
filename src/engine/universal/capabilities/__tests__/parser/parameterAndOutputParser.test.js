const parameterAndOutputParser = require('../../parser/parameterAndOutputParser');
const expandedList = require('../data/expandedJSONLD');

describe('#parseParamRecursively', () => {
  const parameterMapping = [
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:heightParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [{ '@value': 'h' }],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:widthParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [{ '@value': 'w' }],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:dpiParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [{ '@value': 'dpi' }],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:optionsParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'options' },
      ],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:optionsParameter' },
        { '@value': '_:blackWhiteParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'options/blackWhite' },
      ],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:optionsParameter' },
        { '@value': '_:rotationParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'options/rotation' },
      ],
    },
  ];
  const parameterDescriptions = [
    {
      '@id': '_:heightParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Integer'],
      'https://w3id.org/function/ontology#predicate': [{ '@type': ['https://schema.org/height'] }],
      'https://w3id.org/function/ontology#required': [{ '@value': true }],
      'https://schema.org/unitText': [{ '@value': 'px' }],
    },
    {
      '@id': '_:widthParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Integer'],
      'https://w3id.org/function/ontology#predicate': [{ '@type': ['https://schema.org/width'] }],
      'https://w3id.org/function/ontology#required': [{ '@value': true }],
      'https://schema.org/maxValue': [{ '@value': 20 }],
      'https://schema.org/unitText': [{ '@value': 'px' }],
    },
    {
      '@id': '_:dpiParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Integer'],
      'https://w3id.org/function/ontology#predicate': [{ '@type': ['/dpi'] }],
      'https://w3id.org/function/ontology#required': [{ '@value': false }],
      'https://schema.org/description': [{ '@value': 'required Dots Per Inch value, resolution' }],
    },
    {
      '@id': '_:optionsParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', '_:options'],
      'https://w3id.org/function/ontology#predicate': [{ '@type': ['/options'] }],
      'https://w3id.org/function/ontology#required': [{ '@value': false }],
      'http://purl.org/dc/terms/hasPart': [
        {
          '@list': [
            {
              '@id': '_:blackWhiteParameter',
              '@type': [
                'https://w3id.org/function/ontology#Parameter',
                'https://schema.org/Boolean',
              ],
              'https://w3id.org/function/ontology#predicate': [{ '@type': ['/blackWhite'] }],
              'https://w3id.org/function/ontology#required': [{ '@value': false }],
              'https://schema.org/defaultValue': [{ '@value': false }],
            },
            {
              '@id': '_:rotationParameter',
              '@type': [
                'https://w3id.org/function/ontology#Parameter',
                'https://schema.org/Integer',
              ],
              'https://w3id.org/function/ontology#predicate': [{ '@type': ['/rotation'] }],
              'https://w3id.org/function/ontology#required': [{ '@value': false }],
              'https://schema.org/defaultValue': [{ '@value': 0 }],
              'https://schema.org/maxValue': [{ '@value': 359 }],
              'https://schema.org/minValue': [{ '@value': 0 }],
            },
          ],
        },
      ],
    },
  ];
  const args = {
    'https://schema.org/height': { value: 50, unit: 'px' },
    width: 10,
    dpi: 50,
    options: { blackWhite: false, rotation: 40 },
  };
  it('parses the parameter correctly and returns the mapped values and parameter', () => {
    const expectedArg = { '@id': '_:heightParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(
        expectedArg,
        parameterMapping,
        parameterDescriptions,
        args
      )
    ).toEqual([{ h: 50 }]);
  });

  it('parses the parameter correctly and returns the mapped values and of width parameter', () => {
    const expectedArg = { '@id': '_:widthParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(
        expectedArg,
        parameterMapping,
        parameterDescriptions,
        args
      )
    ).toEqual([{ w: 10 }]);
  });

  it('parses the parameter correctly and returns the mapped values and parameter and parameter does not have a universal identifier', () => {
    const expectedArg = { '@id': '_:dpiParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(
        expectedArg,
        parameterMapping,
        parameterDescriptions,
        args
      )
    ).toEqual([{ dpi: 50 }]);
  });

  it('parses the parameter correctly and returns the mapped values and parameter and the parameter is an object', () => {
    const expectedArg = { '@id': '_:optionsParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(
        expectedArg,
        parameterMapping,
        parameterDescriptions,
        args
      )
    ).toEqual([{ 'options/blackWhite': false }, { 'options/rotation': 40 }]);
  });

  const mapping = [
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:nofilesaveParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'nofilesave' },
      ],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:heightParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'height' },
      ],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:widthParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'width' },
      ],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:encodingFormatParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'encoding' },
      ],
    },
    {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:durationParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [{ '@value': 'time' }],
    },
  ];
  const desc = [
    {
      '@id': '_:nofilesaveParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Boolean'],
      'https://w3id.org/function/ontology#predicate': [{ '@type': ['/nofilesave'] }],
      'https://w3id.org/function/ontology#required': [{ '@value': false }],
      'https://schema.org/defaultValue': [{ '@value': 'true' }],
      'https://schema.org/description': [
        { '@value': "The image taken won't be saved locally by default" },
      ],
    },
    {
      '@id': '_:heightParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Integer'],
      'https://w3id.org/function/ontology#predicate': [{ '@type': ['https://schema.org/height'] }],
      'https://w3id.org/function/ontology#required': [{ '@value': false }],
      'https://schema.org/defaultValue': [{ '@value': 700 }],
    },
    {
      '@id': '_:widthParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Integer'],
      'https://w3id.org/function/ontology#predicate': [{ '@type': ['https://schema.org/width'] }],
      'https://w3id.org/function/ontology#required': [{ '@value': false }],
      'https://schema.org/defaultValue': [{ '@value': 700 }],
    },
    {
      '@id': '_:encodingFormatParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Text'],
      'https://w3id.org/function/ontology#predicate': [
        { '@type': ['https://schema.org/encodingFormat'] },
      ],
      'https://w3id.org/function/ontology#required': [{ '@value': false }],
      'https://schema.org/defaultValue': [{ '@value': 'jpg' }],
      'https://schema.org/encodingFormat': [{ '@value': 'jpg' }],
    },
    {
      '@id': '_:durationParameter',
      '@type': ['https://w3id.org/function/ontology#Parameter', 'https://schema.org/Integer'],
      'https://w3id.org/function/ontology#predicate': [
        { '@type': ['https://schema.org/Duration'] },
      ],
      'https://w3id.org/function/ontology#required': [{ '@value': false }],
    },
  ];
  const givenArgs = {
    nofilesave: true,
    height: 10,
    'https://schema.org/width': 20,
    encodingFormat: 'jpg',
    Duration: 2,
  };
  it('parses the parameter correctly and returns the mapped values/parameter exemplified with PROCEED use case for nofilesave Parameter', () => {
    const expectedArg = { '@id': '_:nofilesaveParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(expectedArg, mapping, desc, givenArgs)
    ).toEqual([{ nofilesave: true }]);
  });

  it('parses the parameter correctly and returns the mapped values/parameter exemplified with PROCEED use case for height Parameter', () => {
    const expectedArg = { '@id': '_:heightParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(expectedArg, mapping, desc, givenArgs)
    ).toEqual([{ height: 10 }]);
  });

  it('parses the parameter correctly and returns the mapped values/parameter exemplified with PROCEED use case for width Parameter', () => {
    const expectedArg = { '@id': '_:widthParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(expectedArg, mapping, desc, givenArgs)
    ).toEqual([{ width: 20 }]);
  });

  it('parses the parameter correctly and returns the mapped values/parameter exemplified with PROCEED use case for time Parameter', () => {
    const expectedArg = { '@id': '_:durationParameter' };
    expect(
      parameterAndOutputParser.parseParamRecursively(expectedArg, mapping, desc, givenArgs)
    ).toEqual([{ time: 2 }]);
  });
});
describe('#parseArguments', () => {
  it('parses the arguments and returns the cleaned mapped argument object', () => {
    const args = {
      'https://schema.org/height': { value: 50, unit: 'px' },
      width: 10,
      dpi: 50,
      options: { blackWhite: false, rotation: 40 },
    };
    expect(parameterAndOutputParser.parseArguments(args, expandedList)).toEqual({
      h: 50,
      w: 10,
      dpi: 50,
      options: { blackWhite: false, rotation: 40 },
    });
  });
});

describe('#parseOutput', () => {
  it('parses the outputs and returns the cleaned mapped return object', () => {
    const outputObject = {
      photo: 'helloWorld.jpg',
      gps: { lat: -50, long: 12 },
    };
    expect(parameterAndOutputParser.parseOutput(expandedList, outputObject)).toEqual({
      GeoCoordinates: { latidute: -50, longitude: 12 },
      Photograph: 'helloWorld.jpg',
    });
  });
});
describe('#findMapping', () => {
  it('finds the corresponding mapping from the expanded list', () => {
    const parameterMapping = [
      {
        '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
        'https://w3id.org/function/vocabulary/mapping#functionParameter': [
          { '@value': '_:nofilesaveParameter' },
        ],
        'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
          { '@value': 'nofilesave' },
        ],
      },
      {
        '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
        'https://w3id.org/function/vocabulary/mapping#functionParameter': [
          { '@value': '_:heightParameter' },
        ],
        'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
          { '@value': 'height' },
        ],
      },
      {
        '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
        'https://w3id.org/function/vocabulary/mapping#functionParameter': [
          { '@value': '_:widthParameter' },
        ],
        'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
          { '@value': 'width' },
        ],
      },
      {
        '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
        'https://w3id.org/function/vocabulary/mapping#functionParameter': [
          { '@value': '_:encodingFormatParameter' },
        ],
        'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
          { '@value': 'encoding' },
        ],
      },
      {
        '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
        'https://w3id.org/function/vocabulary/mapping#functionParameter': [
          { '@value': '_:durationParameter' },
        ],
        'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
          { '@value': 'time' },
        ],
      },
    ];
    const key = { '@id': '_:heightParameter' };
    const expectedMapping = {
      '@type': ['https://w3id.org/function/vocabulary/mapping#PropertyParameterMapping'],
      'https://w3id.org/function/vocabulary/mapping#functionParameter': [
        { '@value': '_:heightParameter' },
      ],
      'https://w3id.org/function/vocabulary/mapping#implementationProperty': [
        { '@value': 'height' },
      ],
    };
    expect(parameterAndOutputParser.findMapping(parameterMapping, key)).toEqual(expectedMapping);
  });
});
