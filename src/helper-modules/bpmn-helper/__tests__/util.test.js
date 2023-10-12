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

const util = require('../src/util.js');

describe('Tests for the utility functions of this library', () => {
  let baseXML;
  let baseObj;
  let bigObj;
  beforeEach(() => {
    baseXML = fs.readFileSync(path.resolve(__dirname, './data/baseBPMN.xml'), 'utf8');
    baseObj = JSON.parse(JSON.stringify(baseJSON));
    bigObj = JSON.parse(JSON.stringify(bigJSON));
    jest.clearAllMocks();
  });

  test('getElementsByTagName', () => {
    const matches = util.getElementsByTagName(bigObj, 'proceed:processConstraints');

    const expected = [
      bigJSON.rootElements[0].flowElements[2].extensionElements.values[0],
      bigJSON.rootElements[0].flowElements[6].extensionElements.values[0],
    ];

    expect(matches).toEqual(expected);
  });

  test('getElementById', () => {
    const match = util.getElementById(bigObj, 'EndEvent_16twtfn');

    const expected = bigJSON.rootElements[0].flowElements[4];

    expect(match).toStrictEqual(expected);
  });

  test('manipulateElementById', async () => {
    await util.manipulateElementById(baseXML, 'sample-diagram', (element) => {
      element.exporterVersion = '0.0.2';
    });

    baseObj.exporterVersion = '0.0.2';

    // check if object was correctly changed before we tried converting to xml
    expect(mockToXML.mock.calls[0][0]).toStrictEqual(baseObj);
  });
});
