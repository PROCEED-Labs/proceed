const fs = require('fs');
const path = require('path');
const baseJSON = require('./data/baseBPMN.json');
const bigJSON = require('./data/bigBPMN.json');

const mockFromXML = jest.fn();
const mockToXML = jest.fn();
const mockCreate = jest.fn();

jest.doMock('bpmn-moddle', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      fromXML: mockFromXML,
      toXML: mockToXML,
      create: mockCreate,
    })),
  };
});

mockToXML.mockImplementation((_, a) => ({ xml: '' }));
mockCreate.mockImplementation((name) => ({ $type: name }));
mockFromXML.mockImplementation((_, a) => ({
  rootElement: JSON.parse(JSON.stringify(baseJSON)),
}));

const setters = require('../src/setters.js');

describe('Tests for setter functions of this library', () => {
  let baseXML;
  let baseObj;
  let bigObj;
  beforeEach(() => {
    baseXML = fs.readFileSync(path.resolve(__dirname, './data/baseBPMN.xml'), 'utf8');
    baseObj = JSON.parse(JSON.stringify(baseJSON));
    bigObj = JSON.parse(JSON.stringify(bigJSON));
    jest.clearAllMocks();
  });

  test('setDefinitionsId', async () => {
    await setters.setDefinitionsId(baseXML, '12345');

    baseObj.id = '12345';
    //baseObj.originalId = 'sample-diagram';

    expect(mockToXML.mock.calls[0][0]).toStrictEqual(baseObj);
  });

  test('setDefinitionsName', async () => {
    await setters.setDefinitionsName(baseXML, 'Test123');

    baseObj.name = 'Test123';

    expect(mockToXML.mock.calls[0][0]).toStrictEqual(baseObj);
  });

  test('setTargetNamespace', async () => {
    await setters.setTargetNamespace(baseXML, '12345');

    baseObj.targetNamespace += '12345';
    baseObj.originalTargetNamespace = 'https://docs.proceed-labs.org/';

    expect(mockToXML.mock.calls[0][0]).toStrictEqual(baseObj);
  });

  test('setStandardDefinitions', async () => {
    await setters.setStandardDefinitions(baseXML, 'PROCEED', '42.0.13');

    baseObj.exporter = 'PROCEED';
    baseObj.exporterVersion = '42.0.13';
    baseObj.expressionLanguage = 'https://ecma-international.org/ecma-262/8.0/';
    baseObj.typeLanguage =
      'https://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf';
    baseObj.creatorSpaceId = '';
    baseObj.creatorSpaceName = '';
    // baseObj.originalExporter = 'PROCEED Management System';
    // baseObj.originalExporterVersion = '0.1.0';
    baseObj.$attrs = {
      xmlns: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
      'xmlns:proceed': 'https://docs.proceed-labs.org/BPMN',
      'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
      'xsi:schemaLocation': [
        'https://docs.proceed-labs.org/BPMN',
        'https://docs.proceed-labs.org/xsd/XSD-PROCEED.xsd',
        'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'https://www.omg.org/spec/BPMN/20100501/BPMN20.xsd',
      ].join(' '),
    };

    expect(mockToXML.mock.calls[0][0]).toStrictEqual(baseObj);
  });

  test('setDeploymentMethod', async () => {
    await setters.setDeploymentMethod(baseXML, 'dynamic');

    baseObj.rootElements[0].deploymentMethod = 'dynamic';

    expect(mockToXML.mock.calls[0][0]).toStrictEqual(baseObj);
  });
});
