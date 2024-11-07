import 'server-only';
import {
  toBpmnObject,
  toBpmnXml,
  getDefinitionsId,
  setDefinitionsVersionInformation,
  getDefinitionsVersionInformation,
  getUserTaskImplementationString,
  getUserTaskFileNameMapping,
  setUserTaskData,
} from '@proceed/bpmn-helper';
import { asyncForEach } from './javascriptHelpers';
import {
  deleteProcessUserTask,
  getProcessUserTasksJSON,
  saveProcessUserTask,
} from '../data/legacy/_process';
import { getUserTaskJSON } from '../data/legacy/fileHandling';
import { Process } from '../data/process-schema';
import { enableUseDB } from 'FeatureFlags';
import { TProcessModule } from '../data/module-import-types-temp';

const { diff } = require('bpmn-js-differ');

// remove later after legacy code is removed
let getProcessVersionBpmn: TProcessModule['getProcessVersionBpmn'];
let updateProcess: TProcessModule['updateProcess'];
let getProcessBpmn: TProcessModule['getProcessBpmn'];

const loadModules = async () => {
  const moduleImport = await (enableUseDB
    ? import('@/lib/data/db/process')
    : import('@/lib/data/legacy/_process'));

  ({ getProcessVersionBpmn, updateProcess, getProcessBpmn } = moduleImport);
};

loadModules().catch(console.error);

// TODO: This used to be a helper file in the old management system. It used
// client-side local data from the Vue store and a lot of data sent to the
// server, which resulted in a lot of unnecessary requests to the backend. This
// should be refactored to reflect the fact this runs on the server now.

export async function areVersionsEqual(bpmn: string, otherBpmn: string) {
  const bpmnObj = await toBpmnObject(bpmn);
  const otherBpmnObj = await toBpmnObject(otherBpmn);

  const {
    version,
    name: versionName,
    description: versionDescription,
    versionBasedOn,
  } = await getDefinitionsVersionInformation(otherBpmnObj);

  if (version) {
    // check if the two bpmns were the same if they had the same version information
    await setDefinitionsVersionInformation(bpmnObj, {
      version,
      versionName,
      versionDescription,
      versionBasedOn,
    });

    // compare the two bpmns
    const changes = diff(otherBpmnObj, bpmnObj);
    const hasChanges =
      Object.keys(changes._changed).length ||
      Object.keys(changes._removed).length ||
      Object.keys(changes._added).length ||
      Object.keys(changes._layoutChanged).length;

    return !hasChanges;
  }

  return false;
}

export async function convertToEditableBpmn(bpmn: string) {
  let bpmnObj = await toBpmnObject(bpmn);

  const { version } = await getDefinitionsVersionInformation(bpmnObj);

  bpmnObj = (await setDefinitionsVersionInformation(bpmnObj, {
    versionBasedOn: version,
  })) as object;

  const changedFileNames = {} as { [key: string]: string };

  const fileNameMapping = await getUserTaskFileNameMapping(bpmnObj);

  await asyncForEach(Object.entries(fileNameMapping), async ([userTaskId, { fileName }]) => {
    if (fileName) {
      const [unversionedName] = fileName.split('-');
      changedFileNames[fileName] = unversionedName;
      await setUserTaskData(bpmnObj, userTaskId, unversionedName);
    }
  });

  return { bpmn: await toBpmnXml(bpmnObj), changedFileNames };
}

export async function getLocalVersionBpmn(process: Process, localVersion: number) {
  // early exit if there are no known versions for the process locally
  if (!Array.isArray(process.versions) || !process.versions.length) return;

  // check if the specific version exists locally and get its bpmn if it does
  if (process.versions.some(({ version }) => +version == localVersion)) {
    const bpmn = getProcessVersionBpmn(process.id, localVersion);
    return bpmn;
  }
}

export async function versionUserTasks(
  processInfo: Process,
  newVersion: number,
  bpmnObj: object,
  dryRun = false,
) {
  const dataMapping = await getUserTaskFileNameMapping(bpmnObj);

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let userTaskId in dataMapping) {
    const { fileName, implementation } = dataMapping[userTaskId];

    // only version user tasks that use html
    if (fileName && implementation === getUserTaskImplementationString()) {
      const userTaskData = getUserTaskJSON(processInfo.id, fileName);

      let versionFileName = `${fileName}-${newVersion}`;

      // get the data of the user task in the based on version (if there is one and it is locally known)
      const basedOnBPMN =
        versionBasedOn !== undefined
          ? await getLocalVersionBpmn(processInfo, versionBasedOn)
          : undefined;

      // check if there is a preceding version and if the data of the user task actually changed from that version
      let userTaskDataAlreadyExisting = false;
      if (basedOnBPMN) {
        const basedOnVersionDataMapping = await getUserTaskFileNameMapping(basedOnBPMN);

        // check if the user task existed and if it had the same data
        const basedOnVersionFileInfo = basedOnVersionDataMapping[userTaskId];

        if (basedOnVersionFileInfo && basedOnVersionFileInfo.fileName) {
          const basedOnVersionUserTaskData = getUserTaskJSON(
            processInfo.id,
            basedOnVersionFileInfo.fileName,
          );

          if (basedOnVersionUserTaskData === userTaskData) {
            // reuse the data of the previous version
            userTaskDataAlreadyExisting = true;
            versionFileName = basedOnVersionFileInfo.fileName;
          }
        }
      }

      // make sure the user task is using the correct data
      await setUserTaskData(
        bpmnObj,
        userTaskId,
        versionFileName,
        getUserTaskImplementationString(),
      );

      // store the user task version if it didn't exist before
      if (!dryRun && !userTaskDataAlreadyExisting) {
        saveProcessUserTask(processInfo.id, versionFileName, userTaskData);
      }
    }
  }
}

export async function updateProcessVersionBasedOn(processInfo: Process, versionBasedOn: number) {
  if (processInfo?.bpmn) {
    const { version, description, name } = await getDefinitionsVersionInformation(processInfo.bpmn);

    const bpmn = (await setDefinitionsVersionInformation(processInfo.bpmn, {
      version,
      versionDescription: description,
      versionName: name,
      versionBasedOn,
    })) as string;

    await updateProcess(processInfo.id, { bpmn });
  }
}

const getUsedFileNames = async (bpmn: string) => {
  const userTaskFileNameMapping = await getUserTaskFileNameMapping(bpmn);

  const fileNames = new Set<string>();

  Object.values(userTaskFileNameMapping).forEach(({ fileName }) => {
    if (fileName) {
      fileNames.add(fileName);
    }
  });

  return [...fileNames];
};

export async function selectAsLatestVersion(processId: string, version: number) {
  // make sure that the user task data is also rolled back
  const processDataMapping = await getProcessUserTasksJSON(processId);

  const editableBpmn = (await getProcessBpmn(processId)) as string;
  const versionBpmn = (await getProcessVersionBpmn(processId, version)) as string;
  const fileNamesinEditableVersion = await getUsedFileNames(editableBpmn);

  const { bpmn: convertedBpmn, changedFileNames } = await convertToEditableBpmn(versionBpmn);

  // Delete UserTasks stored for latest version
  await asyncForEach(fileNamesinEditableVersion, async (taskFileName) => {
    await deleteProcessUserTask(processId, taskFileName);
  });

  // Store UserTasks from this version as UserTasks from latest version
  await asyncForEach(Object.entries(changedFileNames), async ([oldName, newName]) => {
    await saveProcessUserTask(processId, newName, processDataMapping[oldName]);
  });

  // Store bpmn from this version as latest version
  await updateProcess(processId, { bpmn: convertedBpmn });
}
