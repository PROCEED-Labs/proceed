import 'server-only';
import {
  toBpmnObject,
  toBpmnXml,
  setDefinitionsVersionInformation,
  getDefinitionsVersionInformation,
  getUserTaskImplementationString,
  getUserTaskFileNameMapping,
  getScriptTaskFileNameMapping,
  setUserTaskData,
  setScriptTaskData,
} from '@proceed/bpmn-helper';
import { asyncForEach } from './javascriptHelpers';
import {
  deleteProcessUserTask,
  getProcessUserTasksHtml,
  getProcessUserTasksJSON,
  getProcessScriptTasksScript,
  saveProcessUserTask,
  saveProcessScriptTask,
} from '../data/legacy/_process';
import { getUserTaskJSON, getUserTaskHTML, getScriptTaskScript } from '../data/legacy/fileHandling';
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
  const htmlMapping = await getUserTaskFileNameMapping(bpmnObj);

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let userTaskId in htmlMapping) {
    const { fileName, implementation } = htmlMapping[userTaskId];

    // only version user tasks that use html
    if (fileName && implementation === getUserTaskImplementationString()) {
      const userTaskHtml = getUserTaskHTML(processInfo.id, fileName);

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
          const basedOnVersionUserTaskHtml = getUserTaskHTML(
            processInfo.id,
            basedOnVersionFileInfo.fileName,
          );

          if (basedOnVersionUserTaskHtml === userTaskHtml) {
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
        const userTaskData = getUserTaskJSON(processInfo.id, fileName);
        saveProcessUserTask(processInfo.id, versionFileName, userTaskData, userTaskHtml);
      }
    }
  }
}

export async function versionScriptTasks(
  processInfo: Process,
  newVersion: number,
  bpmnObj: object,
  dryRun = false,
) {
  const scriptMapping = await getScriptTaskFileNameMapping(bpmnObj);

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let scriptTaskId in scriptMapping) {
    const { fileName } = scriptMapping[scriptTaskId];

    // only handle script tasks that reference a file
    if (fileName) {
      const scriptTaskJS = getScriptTaskScript(processInfo.id, fileName + '.js');
      const scriptTaskTS = getScriptTaskScript(processInfo.id, fileName + '.ts');

      let versionFileName = `${fileName}-${newVersion}`;

      // get the script of the script task in the based on version (if there is one and it is locally known)
      const basedOnBPMN =
        versionBasedOn !== undefined
          ? await getLocalVersionBpmn(processInfo, versionBasedOn)
          : undefined;

      // check if there is a preceding version and if the script of the script task actually changed from that version
      let scriptTaskScriptAlreadyExisting = false;
      if (basedOnBPMN) {
        const basedOnVersionScriptMapping = await getScriptTaskFileNameMapping(basedOnBPMN);

        // check if the script task existed and if it had the same script
        const basedOnVersionFileInfo = basedOnVersionScriptMapping[scriptTaskId];

        if (basedOnVersionFileInfo && basedOnVersionFileInfo.fileName) {
          const basedOnVersionScriptTaskJS = getScriptTaskScript(
            processInfo.id,
            basedOnVersionFileInfo.fileName + '.js',
          );
          const basedOnVersionScriptTaskTS = getScriptTaskScript(
            processInfo.id,
            basedOnVersionFileInfo.fileName + '.ts',
          );

          console.log(
            basedOnVersionScriptTaskJS,
            scriptTaskJS,
            basedOnVersionScriptTaskTS,
            scriptTaskTS,
            basedOnVersionScriptTaskJS === scriptTaskJS,
            basedOnVersionScriptTaskTS === scriptTaskTS,
          );

          if (
            basedOnVersionScriptTaskJS === scriptTaskJS &&
            basedOnVersionScriptTaskTS === scriptTaskTS
          ) {
            // reuse the script of the previous version
            scriptTaskScriptAlreadyExisting = true;
            versionFileName = basedOnVersionFileInfo.fileName;
          }
        }
      }

      // make sure the script task is using the correct data
      await setScriptTaskData(bpmnObj, scriptTaskId, versionFileName);

      // store the script task version if it didn't exist before
      if (!dryRun && !scriptTaskScriptAlreadyExisting) {
        saveProcessScriptTask(processInfo.id, versionFileName + '.js', scriptTaskJS);
        saveProcessScriptTask(processInfo.id, versionFileName + '.ts', scriptTaskTS);
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
  // make sure that the user task data and html is also rolled back
  const processDataMapping = await getProcessUserTasksJSON(processId);
  const processHtmlMapping = await getProcessUserTasksHtml(processId);

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
    await saveProcessUserTask(
      processId,
      newName,
      processDataMapping[oldName],
      processHtmlMapping[oldName],
    );
  });

  // Store bpmn from this version as latest version
  await updateProcess(processId, { bpmn: convertedBpmn });
}
