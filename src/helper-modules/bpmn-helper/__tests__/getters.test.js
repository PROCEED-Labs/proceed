const fs = require('fs');
const path = require('path');
const baseJSON = require('./data/baseBPMN.json');
const deploymentJSON = require('./data/deploymentBPMN.json');
const twoProcessJSON = require('./data/twoProcesses.json');

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

const getters = require('../src/getters.js');
const { get } = require('http');

describe('Tests for getter functions of this library', () => {
  let baseXML;
  let baseObj;
  let deploymentXML;
  let deploymentObj;
  let twoProcessXML;
  let twoProcessObj;
  beforeEach(() => {
    baseXML = fs.readFileSync(path.resolve(__dirname, './data/baseBPMN.xml'), 'utf8');
    deploymentXML = fs.readFileSync(path.resolve(__dirname, './data/deploymentBPMN.xml'), 'utf8');
    twoProcessXML = fs.readFileSync(path.resolve(__dirname, './data/twoProcesses.xml'), 'utf8');
    baseObj = JSON.parse(JSON.stringify(baseJSON));
    deploymentObj = JSON.parse(JSON.stringify(deploymentJSON));
    twoProcessObj = JSON.parse(JSON.stringify(twoProcessJSON));
    jest.clearAllMocks();
  });

  describe('getStartEvents', () => {
    it('returns the id of the startEvent in the given process description', async () => {
      expect(await getters.getStartEvents(baseXML)).toStrictEqual(['StartEvent_1']);
    });
  });

  describe('getDefinitionsId', () => {
    it('returns the id in the definitions field of the process description', async () => {
      expect(await getters.getDefinitionsId(baseXML)).toStrictEqual('sample-diagram');
    });
  });

  describe('getDefinitionsName', () => {
    it('returns the name in the definitions field in the given process description', async () => {
      expect(await getters.getDefinitionsName(baseXML)).toStrictEqual('Test');
    });
  });

  describe('getDeploymentMethod', () => {
    it('returns the deploymentMethod for the given process', async () => {
      mockFromXML.mockImplementationOnce((_a, _b) => ({
        rootElement: JSON.parse(JSON.stringify(deploymentObj)),
      }));
      expect(await getters.getDeploymentMethod(deploymentXML)).toBe('static');
    });
  });
  describe('getElementMachineMapping', () => {
    it('returns a mapping from task ids to assigned machineIds or addresses', async () => {
      mockFromXML.mockImplementationOnce((_a, _b) => ({
        rootElement: JSON.parse(JSON.stringify(deploymentObj)),
      }));
      expect(await getters.getElementMachineMapping(deploymentXML)).toStrictEqual({
        StartEvent_1: { machineId: '1234', machineAddress: undefined },
        EndEvent_1d3ier5: { machineId: undefined, machineAddress: '192.168.1.1:1234' },
        Task_074i09w: { machineId: '1234', machineAddress: undefined },
      });
    });
  });
  describe('getProcessIds', () => {
    it('returns the ids of all processes in the process definition', async () => {
      mockFromXML.mockImplementationOnce((_a, _b) => ({
        rootElement: JSON.parse(JSON.stringify(twoProcessObj)),
      }));
      expect(await getters.getProcessIds(twoProcessXML)).toStrictEqual([
        'Process_02x86ax',
        'Process_0xqodb2',
      ]);
    });
  });
});
