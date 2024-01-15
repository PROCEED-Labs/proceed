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
import { ApiData } from '../fetch-data';
import { asyncForEach, asyncMap } from './javascriptHelpers';
import {
  deleteProcessUserTask,
  getProcessUserTaskHtml,
  getProcessBpmn,
  getProcessUserTasksHtml,
  getProcessVersionBpmn,
  saveProcessUserTask,
  updateProcess,
} from '../data/legacy/_process';
import { getUserTaskHTML } from '../data/legacy/fileHandling';

const { diff } = require('bpmn-js-differ');

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

export async function getLocalVersionBpmn(
  process: ApiData<'/process', 'get'>[number],
  localVersion: number,
) {
  // early exit if there are no known versions for the process locally
  if (!Array.isArray(process.versions) || !process.versions.length) return;

  // check if the specific version exists locally and get its bpmn if it does
  if (process.versions.some(({ version }) => +version == localVersion)) {
    const bpmn = getProcessVersionBpmn(process.definitionId, String(localVersion));
    return bpmn;
  }
}

export async function versionUserTasks(
  processInfo: ApiData<'/process', 'get'>[number],
  newVersion: number,
  bpmnObj: object,
  dryRun = false,
) {
  const htmlMapping = await getUserTaskFileNameMapping(bpmnObj);

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let userTaskId in htmlMapping) {
    const { fileName, implementation } = htmlMapping[userTaskId];
    // only version user tasks that use html
    if (fileName && implementation === getUserTaskImplementationString()) {
      const userTaskHTML = getUserTaskHTML(processInfo.definitionId, fileName);

      let versionFileName = `${fileName}-${newVersion}`;

      // get the html of the user task in the based on version (if there is one and it is locally known)
      const basedOnBPMN =
        versionBasedOn !== undefined
          ? await getLocalVersionBpmn(processInfo, versionBasedOn)
          : undefined;

      // check if there is a preceding version and if the html of the user task actually changed from that version
      let userTaskHtmlAlreadyExisting = false;
      if (basedOnBPMN) {
        const basedOnVersionHtmlMapping = await getUserTaskFileNameMapping(basedOnBPMN);

        // check if the user task existed and if it had the same html
        const basedOnVersionFileInfo = basedOnVersionHtmlMapping[userTaskId];

        if (basedOnVersionFileInfo && basedOnVersionFileInfo.fileName) {
          const basedOnVersionUserTaskHTML = getUserTaskHTML(
            processInfo.definitionId,
            basedOnVersionFileInfo.fileName,
          );

          if (basedOnVersionUserTaskHTML === userTaskHTML) {
            // reuse the html of the previous version
            userTaskHtmlAlreadyExisting = true;
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
      if (!dryRun && !userTaskHtmlAlreadyExisting) {
        saveProcessUserTask(processInfo.definitionId, versionFileName, userTaskHTML);
      }
    }
  }
}

export async function updateProcessVersionBasedOn(
  processInfo: ApiData<'/process', 'get'>[number],
  versionBasedOn: number,
) {
  if (processInfo?.bpmn) {
    const { version, description, name } = await getDefinitionsVersionInformation(processInfo.bpmn);

    const bpmn = (await setDefinitionsVersionInformation(processInfo.bpmn, {
      version,
      versionDescription: description,
      versionName: name,
      versionBasedOn,
    })) as string;

    await updateProcess(processInfo.definitionId, { bpmn });
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
  // make sure that the html is also rolled back
  const processHtmlMapping = await getProcessUserTasksHtml(processId);

  const editableBpmn = await getProcessBpmn(processId);
  const versionBpmn = await getProcessVersionBpmn(processId, String(version));
  const fileNamesinEditableVersion = await getUsedFileNames(editableBpmn);

  const { bpmn: convertedBpmn, changedFileNames } = await convertToEditableBpmn(versionBpmn);

  // Delete UserTasks stored for latest version
  await asyncForEach(fileNamesinEditableVersion, async (taskFileName) => {
    await deleteProcessUserTask(processId, taskFileName);
  });

  // Store UserTasks from this version as UserTasks from latest version
  await asyncForEach(Object.entries(changedFileNames), async ([oldName, newName]) => {
    await saveProcessUserTask(processId, newName, processHtmlMapping[oldName]);
  });

  // Store bpmn from this version as latest version
  await updateProcess(processId, { bpmn: convertedBpmn });
}
