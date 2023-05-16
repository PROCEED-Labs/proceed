jest.mock('@proceed/system', () => {
  const original = jest.requireActual('@proceed/system');

  return {
    data: {
      ...original.data,
      read: jest.fn(),
      write: jest.fn(),
      delete: jest.fn(),
      writeProcessVersionBpmn: original.data.writeProcessVersionBpmn,
      writeUserTaskHTML: original.data.writeUserTaskHTML,
      readProcessVersionBpmn: original.data.readProcessVersionBpmn,
      getAllUserTasks: original.data.getAllUserTasks,
      readImages: original.data.readImages,
    },
  };
});

jest.mock('@proceed/machine', () => ({
  information: {
    getMachineInformation: jest.fn().mockResolvedValue({ id: 'mockId', ip: 'mockIp' }),
  },
}));

const db = require('../db.js');
const { getRequiredProcessFragments, getHTMLImagesToKnow } = require('../processFragmentCheck');
const { data } = require('@proceed/system');
const fs = require('fs');
const path = require('path');

const { toBpmnObject } = require('@proceed/bpmn-helper');

const OneProcessDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data/OneProcess.xml'),
  'utf-8'
);
const TwoProcessesDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data/TwoProcesses.xml'),
  'utf-8'
);
const OneUserTaskDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data/OneUserTask.xml'),
  'utf-8'
);
const _5thIndustryDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data/5thIndustryDefinition.xml'),
  'utf-8'
);
const MissingHtmlDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data/MissingHtml.xml'),
  'utf-8'
);
const OneImportDefinition = fs.readFileSync(path.resolve(__dirname, 'data/OneImport.xml'), 'utf-8');
const OneImportWrongProcessRefDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data/OneImportWrongProcessRef.xml'),
  'utf-8'
);
const TwoUserTasksStaticDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data/TwoUserTasksStatic.xml'),
  'utf-8'
);
const OneImageDefinition = fs.readFileSync(
  path.resolve(__dirname, 'data', 'OneImage.xml'),
  'utf-8'
);

describe('Tests for the functions in the database module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    data.read.mockResolvedValue(null);
  });

  describe('isProcessExisting', () => {
    it("returns false if the process doesn't exist", async () => {
      const result = await db.isProcessExisting('testFile');

      expect(result).toBe(false);
      expect(data.read).toHaveBeenCalledWith('processes.json/testFile');
    });
    it('returns true if the process exists', async () => {
      data.read.mockResolvedValueOnce('Test');

      const result = await db.isProcessExisting('testFile');

      expect(result).toBe(true);
      expect(data.read).toHaveBeenCalledWith('processes.json/testFile');
    });
  });
  describe('isProcessVersionExisting', () => {
    it('returns false if the process does not exist', async () => {
      const result = await db.isProcessVersionExisting('testFile', 123);

      expect(result).toBe(false);
      expect(data.read).toHaveBeenCalledWith('processes.json/testFile');
    });
    it('returns false if the specific version of the process does not exist', async () => {
      data.read.mockResolvedValueOnce(
        JSON.stringify({
          123: {},
        })
      );

      const result = await db.isProcessVersionExisting('testFile', 456);

      expect(result).toBe(false);
      expect(data.read).toHaveBeenCalledWith('processes.json/testFile');
    });
    it('returns true if the process version exists', async () => {
      data.read.mockResolvedValueOnce(
        JSON.stringify({
          123: {},
        })
      );

      const result = await db.isProcessVersionExisting('testFile', 123);

      expect(result).toBe(true);
      expect(data.read).toHaveBeenCalledWith('processes.json/testFile');
    });
  });
  describe('saveProcessDefinition', () => {
    it('saves the process definition if it contains only one process, also stores some process information', async () => {
      await db.saveProcessVersionDefinition(OneProcessDefinition);

      expect(data.write).toHaveBeenCalledTimes(2);
      expect(data.write.mock.calls[0][0]).toEqual(
        'processes.json/_a04f4854-6e50-408f-8ec5-18f4541c32e9'
      );
      expect(JSON.parse(data.write.mock.calls[0][1])).toEqual({
        123: {
          deploymentDate: expect.any(Number),
          processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
          needs: { html: [], imports: [], images: [] },
          validated: false,
        },
      });
      expect(data.write.mock.calls[1][0]).toEqual(
        '_a04f4854-6e50-408f-8ec5-18f4541c32e9/_a04f4854-6e50-408f-8ec5-18f4541c32e9-123.bpmn'
      );
      expect(data.write.mock.calls[1][1]).toEqual(OneProcessDefinition);
    });
    it('will save the information of the new version alongside the ones for existing versions', async () => {
      data.read.mockResolvedValueOnce(
        JSON.stringify({
          456: 'otherVersionInformation',
        })
      );

      await db.saveProcessVersionDefinition(OneProcessDefinition);

      expect(data.write).toHaveBeenCalledTimes(2);
      expect(data.write.mock.calls[0][0]).toEqual(
        'processes.json/_a04f4854-6e50-408f-8ec5-18f4541c32e9'
      );
      expect(JSON.parse(data.write.mock.calls[0][1])).toEqual({
        123: {
          deploymentDate: expect.any(Number),
          processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
          needs: { html: [], imports: [], images: [] },
          validated: false,
        },
        456: 'otherVersionInformation',
      });
      expect(data.write.mock.calls[1][0]).toEqual(
        '_a04f4854-6e50-408f-8ec5-18f4541c32e9/_a04f4854-6e50-408f-8ec5-18f4541c32e9-123.bpmn'
      );
      expect(data.write.mock.calls[1][1]).toEqual(OneProcessDefinition);
    });
    it('will calculate process fragments (html) the given process depends on', async () => {
      await db.saveProcessVersionDefinition(OneUserTaskDefinition);

      expect(data.write).toHaveBeenCalledTimes(2);
      expect(data.write.mock.calls[0][0]).toEqual(
        'processes.json/_a04f4854-6e50-408f-8ec5-18f4541c32e9'
      );
      expect(JSON.parse(data.write.mock.calls[0][1])).toEqual({
        123: {
          deploymentDate: expect.any(Number),
          processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
          needs: { html: ['User_Task_1'], imports: [], images: [] },
          validated: false,
        },
      });
      expect(data.write.mock.calls[1][0]).toEqual(
        '_a04f4854-6e50-408f-8ec5-18f4541c32e9/_a04f4854-6e50-408f-8ec5-18f4541c32e9-123.bpmn'
      );
      expect(data.write.mock.calls[1][1]).toEqual(OneUserTaskDefinition);
    });
    it('will calculate process fragments (imports) the given process depends on', async () => {
      await db.saveProcessVersionDefinition(OneImportDefinition);

      expect(data.write).toHaveBeenCalledTimes(2);
      expect(data.write.mock.calls[0][0]).toEqual(
        'processes.json/_a04f4854-6e50-408f-8ec5-18f4541c32e9'
      );
      expect(JSON.parse(data.write.mock.calls[0][1])).toEqual({
        789: {
          deploymentDate: expect.any(Number),
          processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
          needs: {
            html: [],
            imports: [
              {
                definitionId: '_a04f4854-6e50-408f-8ec5-18f4541c32e9',
                processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
                version: 123,
              },
            ],
            images: [],
          },
          validated: false,
        },
      });
      expect(data.write.mock.calls[1][0]).toEqual(
        '_a04f4854-6e50-408f-8ec5-18f4541c32e9/_a04f4854-6e50-408f-8ec5-18f4541c32e9-789.bpmn'
      );
      expect(data.write.mock.calls[1][1]).toEqual(OneImportDefinition);
    });
    it('will calculate process fragments (images) the given process depends on', async () => {
      await db.saveProcessVersionDefinition(OneImageDefinition);

      expect(data.write).toHaveBeenCalledTimes(2);
      expect(data.write.mock.calls[0][0]).toEqual(
        'processes.json/_64552049-90bf-4f5b-96dd-e00747261755'
      );
      expect(JSON.parse(data.write.mock.calls[0][1])).toEqual({
        1671024712832: {
          deploymentDate: expect.any(Number),
          processId: 'Process_1j9yeom',
          needs: {
            html: [],
            imports: [],
            images: ['Activity_08fwikp_image123e6803-63a8-4cf1-9596-2999fdd016a7.png'],
          },
          validated: false,
        },
      });
      expect(data.write.mock.calls[1][0]).toEqual(
        '_64552049-90bf-4f5b-96dd-e00747261755/_64552049-90bf-4f5b-96dd-e00747261755-1671024712832.bpmn'
      );
      expect(data.write.mock.calls[1][1]).toEqual(OneImageDefinition);
    });
    it('rejects process descriptions that contain more than one process', async () => {
      await expect(db.saveProcessVersionDefinition(TwoProcessesDefinition)).rejects.toThrowError();

      expect(data.write).toHaveBeenCalledTimes(0);
    });
  });
  describe('saveHTMLString', () => {
    it('saves the html of an user task into the file the process containing it is stored in', async () => {
      data.read.mockResolvedValueOnce(
        JSON.stringify({
          123: {
            deploymentDate: expect.any(Number),
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            needs: { html: [], imports: [], images: [] },
            validated: false,
          },
        })
      );
      const html = '<html><head></head><body><form></form></body></html>';
      await db.saveHTMLString('processDefinitionId', 'taskFileName', html);

      expect(data.write).toHaveBeenCalledTimes(1);
      expect(data.write).toHaveBeenCalledWith(
        'processDefinitionId/user-tasks/taskFileName.html',
        html,
        undefined
      );
    });

    it('parses image dependencies from the html and adds them to process versions that use the user task', async () => {
      data.read.mockResolvedValueOnce(
        JSON.stringify({
          123: {
            deploymentDate: expect.any(Number),
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            needs: { html: [], imports: [], images: [] },
            validated: false,
          },
          456: {
            deploymentDate: expect.any(Number),
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            needs: { html: ['taskFileName'], imports: [], images: [] },
            validated: false,
          },
          678: {
            deploymentDate: expect.any(Number),
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            needs: { html: ['taskFileName'], imports: [], images: [] },
            validated: false,
          },
        })
      );

      const html =
        '<html><head></head><body><form></form><img src="/resources/process/processDefinitionId/images/taskFileName_image72fe83de-2c44-4d1f-ae71-6b323bee7f1c.png"></img></body></html>';
      await db.saveHTMLString('processDefinitionId', 'taskFileName', html);

      expect(data.write).toHaveBeenCalledTimes(2);
      expect(data.write).toHaveBeenCalledWith(
        'processDefinitionId/user-tasks/taskFileName.html',
        html,
        undefined
      );
      expect(data.write).toHaveBeenCalledWith(
        'processes.json/processDefinitionId',
        JSON.stringify({
          123: {
            deploymentDate: expect.any(Number),
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            needs: { html: [], imports: [], images: [] },
            validated: false,
          },
          456: {
            deploymentDate: expect.any(Number),
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            needs: {
              html: ['taskFileName'],
              imports: [],
              images: ['taskFileName_image72fe83de-2c44-4d1f-ae71-6b323bee7f1c.png'],
            },
            validated: false,
          },
          678: {
            deploymentDate: expect.any(Number),
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            needs: {
              html: ['taskFileName'],
              imports: [],
              images: ['taskFileName_image72fe83de-2c44-4d1f-ae71-6b323bee7f1c.png'],
            },
            validated: false,
          },
        })
      );
    });

    it('rejects on missing html', async () => {
      await expect(db.saveHTMLString('processDefinitionId', 'taskFileName')).rejects.toThrowError();
    });
  });

  describe('getter functions', () => {
    describe('getProcessInfo', () => {
      beforeEach(() => {
        data.read.mockImplementation(async (path) => {
          if (path.includes('.bpmn')) {
            return OneProcessDefinition;
          } else {
            return JSON.stringify({
              123: {
                deploymentDate: 1337,
                processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
                needs: { html: [], imports: [], images: [] },
                validated: false,
              },
            });
          }
        });
      });

      it('returns information about all versions of a stored process', async () => {
        const process = await db.getProcessInfo('_a04f4854-6e50-408f-8ec5-18f4541c32e9');
        expect(process).toStrictEqual({
          definitionId: '_a04f4854-6e50-408f-8ec5-18f4541c32e9',
          versions: [
            {
              bpmn: OneProcessDefinition,
              deploymentDate: 1337,
              definitionName: 'OneProcess',
              deploymentMethod: 'dynamic',
              needs: { html: [], imports: [], images: [] },
              version: 123,
              versionName: 'Version 1',
              versionDescription: 'This is the first version',
              basedOnVersion: undefined,
            },
          ],
        });
      });
    });

    describe('getAllUserTasks', () => {
      beforeEach(() => {
        data.read.mockResolvedValueOnce({ processDefinitionId: {} });
        data.read.mockResolvedValueOnce(['html1.html', 'html2.html']);
      });

      it('returns the file names for all user task data', async () => {
        expect(await db.getAllUserTasks('processDefinitionId')).toStrictEqual(['html1', 'html2']);
        expect(data.read).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('getRequiredProcessFragments', () => {
    it('returns empty information if a process does not require any external fragments', async () => {
      const bpmnObj = await toBpmnObject(OneProcessDefinition);

      const result = await getRequiredProcessFragments(bpmnObj);

      expect(result).toEqual({
        html: [],
        imports: [],
        images: [],
      });
    });

    it('returns information about required html if a user task is using any', async () => {
      const bpmnObj = await toBpmnObject(OneUserTaskDefinition);

      const result = await getRequiredProcessFragments(bpmnObj);

      expect(result).toEqual({
        html: ['User_Task_1'],
        imports: [],
        images: [],
      });
    });

    it('returns information about a required import if the process contains a callActivity', async () => {
      const bpmnObj = await toBpmnObject(OneImportDefinition);

      const result = await getRequiredProcessFragments(bpmnObj);

      expect(result).toEqual({
        html: [],
        imports: [
          {
            definitionId: '_a04f4854-6e50-408f-8ec5-18f4541c32e9',
            processId: '_958fd9c3-b99d-4e8e-95a1-a0a618eaa9d3',
            version: 123,
          },
        ],
        images: [],
      });
    });

    it('returns information about required html if a user task is using any', async () => {
      const bpmnObj = await toBpmnObject(_5thIndustryDefinition);

      const result = await getRequiredProcessFragments(bpmnObj);

      expect(result).toEqual({
        html: [],
        imports: [],
        images: [],
      });
    });

    it('will throw if a user task is missing html information', async () => {
      const bpmnObj = await toBpmnObject(MissingHtmlDefinition);

      await expect(getRequiredProcessFragments(bpmnObj)).rejects.toThrow();
    });

    it('will throw if a call activity is not referencing another process', async () => {
      const bpmnObj = await toBpmnObject(OneImportWrongProcessRefDefinition);

      await expect(getRequiredProcessFragments(bpmnObj)).rejects.toThrow();
    });

    it('will ignore tasks that are supposed to be executed on another machine', async () => {
      const bpmnObj = await toBpmnObject(TwoUserTasksStaticDefinition);

      const result = await getRequiredProcessFragments(bpmnObj);

      expect(result).toEqual({
        html: ['User_Task_2'],
        imports: [],
        images: [],
      });
    });
  });

  describe('isProcessVersionValid', () => {
    it('returns true for a process without any user tasks and imports and sets validated flag in file', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'Something';
        } else if (path === 'processDefinitionId/user-tasks/') {
          return [];
        } else if (path === 'processDefinitionId/images/') {
          return [];
        } else {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: { html: [], imports: [], images: [] },
              processId: 'someId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(true);
      expect(data.write).toHaveBeenCalledWith(
        'processes.json/processDefinitionId',
        JSON.stringify({
          123: {
            deploymentDate: 1337,
            validated: true,
            needs: { html: [], imports: [], images: [] },
            processId: 'someId',
          },
        })
      );
    });
    it('returns true immediately when validated flag is set in the process file', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'Something';
        } else {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: true,
              needs: { html: [], imports: [], images: [] },
              processId: 'someId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(true);
      expect(data.write).toBeCalledTimes(0);
    });
    it('returns false for missing user task html', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'someBpmn';
        } else if (path === 'processDefinitionId/user-tasks/') {
          return [];
        } else if (path === 'processDefinitionId/images/') {
          return [];
        } else {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: { html: ['html1'], imports: [], images: [] },
              processId: 'someId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(false);
    });
    it('returns true for process with user task and existing html', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'someBpmn';
        } else if (path === 'processDefinitionId/user-tasks/') {
          return ['html1'];
        } else if (path === 'processDefinitionId/user-tasks/html1.html') {
          return 'someHtml';
        } else if (path === 'processDefinitionId/images/') {
          return [];
        } else {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: { html: ['html1'], imports: [], images: [] },
              processId: 'someId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(true);
    });
    it('returns false for missing definition of imported process', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'someBpmn';
        } else if (path === 'processes.json/processDefinitionId') {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: {
                html: [],
                imports: [{ definitionId: 'otherProcessDefinitionId', version: 456 }],
                images: [],
              },
              processId: 'someId',
            },
          });
        } else {
          return null;
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(false);
    });
    it('returns true for existing imported process with existing user task html', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'someBpmn';
        } else if (path === 'processDefinitionId/user-tasks/') {
          return [];
        } else if (path === 'processDefinitionId/images/') {
          return [];
        } else if (path === 'otherProcessDefinitionId/otherProcessDefinitionId-456.bpmn') {
          return 'someBpmn';
        } else if (path === 'otherProcessDefinitionId/user-tasks/') {
          return ['html2'];
        } else if (path === 'processes.json/processDefinitionId') {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: {
                html: [],
                imports: [
                  {
                    definitionId: 'otherProcessDefinitionId',
                    version: 456,
                    processId: 'someOtherId',
                  },
                ],
                images: [],
              },
              processId: 'someId',
            },
          });
        } else {
          return JSON.stringify({
            456: {
              deploymentDate: 1337,
              validated: false,
              needs: { html: ['html2'], imports: [], images: [] },
              processId: 'someOtherId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(true);
    });
    it("returns false if the process id referenced in the importing definitions doesn't match the process id in the referenced definitions", async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'someBpmn';
        } else if (path === 'processDefinitionId/user-tasks/') {
          return [];
        } else if (path === 'processDefinitionId/images/') {
          return [];
        } else if (path === 'otherProcessDefinitionId/otherProcessDefinitionId-456.bpmn') {
          return 'someBpmn';
        } else if (path === 'otherProcessDefinitionId/user-tasks/') {
          return ['html2.html'];
        } else if (path === 'processes.json/processDefinitionId') {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: {
                html: [],
                imports: [
                  { definitionId: 'otherProcessDefinitionId', version: 456, processId: 'someId' },
                ],
                images: [],
              },
              processId: 'someId',
            },
          });
        } else {
          return JSON.stringify({
            456: {
              deploymentDate: 1337,
              validated: false,
              needs: { html: ['html2'], imports: [], images: [] },
              processId: 'someOtherId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(false);
    });

    it('returns false for missing image', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'someBpmn';
        } else if (path === 'processDefinitionId/user-tasks/') {
          return [];
        } else if (path === 'processDefinitionId/images/') {
          return [];
        } else {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: { html: [], imports: [], images: ['someImage'] },
              processId: 'someId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(false);
    });
    it('returns true for process with existing image', async () => {
      data.read.mockImplementation(async (path) => {
        if (path === 'processDefinitionId/processDefinitionId-123.bpmn') {
          return 'someBpmn';
        } else if (path === 'processDefinitionId/user-tasks/') {
          return [];
        } else if (path === 'processDefinitionId/images/') {
          return ['someImage'];
        } else {
          return JSON.stringify({
            123: {
              deploymentDate: 1337,
              validated: false,
              needs: { html: [], imports: [], images: ['someImage'] },
              processId: 'someId',
            },
          });
        }
      });

      const result = await db.isProcessVersionValid('processDefinitionId', 123);

      expect(result).toBe(true);
    });
  });
  describe('archiveInstance', () => {
    it('stores the instance information inside the process file', async () => {
      await db.archiveInstance('processDefinitionId', 'instanceId', {
        info: 'interesting instance information',
      });

      expect(data.write).toHaveBeenCalledWith(
        'processDefinitionId/instance.json/instanceId',
        '{"info":"interesting instance information"}'
      );
    });
  });
  describe('getArchivedInstances', () => {
    it('returns all archived instances for a specific process', async () => {
      data.read.mockResolvedValueOnce({ definitionId: {} });
      data.read.mockResolvedValueOnce({
        1: '{"info":"interesting instance info"}',
        2: '{"info":"other interesting instance info"}',
      });

      expect(await db.getArchivedInstances('definitionId')).toStrictEqual({
        1: { info: 'interesting instance info' },
        2: { info: 'other interesting instance info' },
      });
    });
  });
});
