jest.mock('uuid', () => ({
  __esModule: true,
  calls: 0,
  v4: jest.fn().mockImplementation(function () {
    return `uniqueId${++this.calls}`;
  }),
}));

let mockCalls = 0;
jest.mock('ids', () => {
  return jest.fn().mockImplementation(() => ({
    next: jest.fn().mockImplementation(function () {
      return mockCalls++;
    }),
  }));
});

import * as processHelpers from '@/frontend/../shared-frontend-backend/helpers/processHelpers.js';
import { getBpmn } from '../../../helpers/processHelpers.js';

import * as uuid from 'uuid';

describe('Tests for process helpers', () => {
  describe('createProcess', () => {
    let exampleProcess;

    beforeEach(async () => {
      jest.clearAllMocks();
      uuid.calls = 0;
      mockCalls = 0;
      exampleProcess = await processHelpers.createProcess({ name: 'example' });
    });

    it('creates a unique process id', () => {
      expect(exampleProcess.metaInfo).toHaveProperty('id', '_uniqueId1');
    });

    it('keeps user defined name', () => {
      expect(exampleProcess.metaInfo).toHaveProperty('name', 'example');
    });

    it('throws when no name and no bpmn is given', async () => {
      await expect(processHelpers.createProcess({})).rejects.toThrow('No name provided');
    });

    it('creates a base bpmn with the given name the created id and a unique id for the contained process, processId is added to metaInfo', async () => {
      expect(exampleProcess).toHaveProperty(
        'bpmn',
        await getBpmn({
          id: '_uniqueId1',
          name: 'example',
          processId: 'Process_0',
          standardDefinitions: true,
        })
      );
      expect(exampleProcess.metaInfo).toHaveProperty('processIds', ['Process_0']);
    });

    it('accepts an already existing bpmn and adds created id, and created processId', async () => {
      uuid.v4.mockReturnValueOnce('definitionsId');
      const result = await processHelpers.createProcess({
        bpmn: await getBpmn({ name: 'someName' }),
      });
      expect(result.bpmn).toEqual(
        await getBpmn({
          id: '_definitionsId',
          name: 'someName',
          processId: 'Process_1',
          standardDefinitions: true,
        })
      );
    });

    it("doesn't create new processId if one already exists", async () => {
      uuid.v4.mockReturnValueOnce('definitionsId');
      const result = await processHelpers.createProcess({
        bpmn: await getBpmn({ name: 'someName', processId: 'someUserDefinedId' }),
      });
      expect(result.bpmn).toEqual(
        await getBpmn({
          id: '_definitionsId',
          name: 'someName',
          processId: 'someUserDefinedId',
          standardDefinitions: true,
        })
      );
    });

    it('parses name from given bpmn', async () => {
      const result = await processHelpers.createProcess({
        bpmn: await getBpmn({ id: 'someId', name: 'Test123' }),
      });

      expect(result.metaInfo).toHaveProperty('name', 'Test123');
    });

    it('throws if no name is provided and none is found in the given bpmn', async () => {
      await expect(
        processHelpers.createProcess({ bpmn: await getBpmn({ id: 'someId' }) })
      ).rejects.toThrow(expect.any(Error));
    });

    it('throws on invalid bpmn', async () => {
      await expect(
        processHelpers.createProcess({ bpmn: 'something thats not a correct bpmn' })
      ).rejects.toThrow(expect.any(Error));
    });

    it('creates entries for creation date and lastEdit date which should be the same', async () => {
      expect(exampleProcess.metaInfo).toHaveProperty('createdOn');
      expect(exampleProcess.metaInfo).toHaveProperty('lastEdited');
      expect(exampleProcess.metaInfo.createdOn).toEqual(exampleProcess.metaInfo.lastEdited);
    });

    it('adds given description to process', async () => {
      uuid.v4.mockReturnValueOnce('definitionsId');
      const result = await processHelpers.createProcess({
        name: 'example',
        description: 'description',
      });
      expect(result.bpmn).toEqual(
        await getBpmn({
          id: '_definitionsId',
          name: 'example',
          processId: 'Process_2',
          startEventId: 'StartEvent_3',
          processDescription: 'description',
          standardDefinitions: true,
        })
      );
    });

    it('parses an existing description from the bpmn if one exists', async () => {
      const result = await processHelpers.createProcess({
        bpmn: await getBpmn({ name: 'test', processDescription: 'someDescription' }),
      });
      expect(result.metaInfo).toHaveProperty('description', 'someDescription');
    });
  });

  describe('getProcessInfo', () => {
    let result;
    beforeEach(async () => {
      result = await processHelpers.getProcessInfo(
        await getBpmn({
          id: 'testId',
          name: 'testName',
          processId: 'testProcess',
          processDescription: 'testDescription',
        })
      );
    });

    it('throws when given no input or non string input', async () => {
      await expect(processHelpers.getProcessInfo()).rejects.toThrow(
        'Expected given bpmn to be of type string but got undefined instead!'
      );
      await expect(processHelpers.getProcessInfo({})).rejects.toThrow(
        'Expected given bpmn to be of type string but got object instead!'
      );
    });

    it('parses the definitions id and name from a given process description', () => {
      expect(result).toHaveProperty('id', 'testId');
      expect(result).toHaveProperty('name', 'testName');
    });

    it("throws if process definitions don't contain an id", async () => {
      await expect(processHelpers.getProcessInfo(await getBpmn({}))).rejects.toThrow(
        'Process definitions do not contain an id.'
      );
    });

    it("throws if process definitions don't contain a name", async () => {
      await expect(processHelpers.getProcessInfo(await getBpmn({ id: 'testId' }))).rejects.toThrow(
        'Process definitions do not contain a name.'
      );
    });

    it('parses the id of the contained process', () => {
      expect(result).toHaveProperty('processIds', ['testProcess']);
    });

    it('parses the description of the contained process', async () => {
      expect(result).toHaveProperty('description', 'testDescription');
    });
  });
});
