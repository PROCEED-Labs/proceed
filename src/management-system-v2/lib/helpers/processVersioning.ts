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

import { Process } from '../data/process-schema';
import { enableUseDB } from 'FeatureFlags';
import { TProcessModule } from '../data/module-import-types-temp';

const { diff } = require('bpmn-js-differ');

// remove later after legacy code is removed
let getProcessVersionBpmn: TProcessModule['getProcessVersionBpmn'];
let updateProcess: TProcessModule['updateProcess'];
let getProcessBpmn: TProcessModule['getProcessBpmn'];
let deleteProcessUserTask: TProcessModule['deleteProcessUserTask'];
let getProcessUserTaskHtml: TProcessModule['getProcessUserTaskHtml'];
let saveProcessUserTask: TProcessModule['saveProcessUserTask'];
let getProcessUserTaskJSON: TProcessModule['getProcessUserTaskJSON'];

let getProcessScriptTaskScript: TProcessModule['getProcessScriptTaskScript'];
let saveProcessScriptTask: TProcessModule['saveProcessScriptTask'];
let deleteProcessScriptTask: TProcessModule['deleteProcessScriptTask'];

const loadModules = async () => {
  const moduleImport = await (enableUseDB
    ? import('@/lib/data/db/process')
    : import('@/lib/data/legacy/_process'));

  ({
    getProcessVersionBpmn,
    updateProcess,
    getProcessBpmn,
    deleteProcessUserTask,
    getProcessUserTaskHtml,
    saveProcessUserTask,
    getProcessUserTaskJSON,
    getProcessScriptTaskScript,
    saveProcessScriptTask,
    deleteProcessScriptTask,
  } = moduleImport);
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
    versionId,
    name: versionName,
    description: versionDescription,
    versionBasedOn,
    versionCreatedOn,
  } = await getDefinitionsVersionInformation(otherBpmnObj);

  if (versionId) {
    // check if the two bpmns were the same if they had the same version information
    await setDefinitionsVersionInformation(bpmnObj, {
      versionId,
      versionName,
      versionDescription,
      versionBasedOn,
      versionCreatedOn,
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

  const { versionId } = await getDefinitionsVersionInformation(bpmnObj);

  bpmnObj = (await setDefinitionsVersionInformation(bpmnObj, {
    versionBasedOn: versionId,
  })) as object;

  const changedUserTaskFileNames = {} as { [key: string]: string };
  const userTaskFileNameMapping = await getUserTaskFileNameMapping(bpmnObj);

  await asyncForEach(
    Object.entries(userTaskFileNameMapping),
    async ([userTaskId, { fileName }]) => {
      if (fileName) {
        const [unversionedName] = fileName.split('-');
        changedUserTaskFileNames[fileName] = unversionedName;
        await setUserTaskData(bpmnObj, userTaskId, unversionedName);
      }
    },
  );

  const changedScriptTaskFileNames = {} as { [key: string]: string };
  const scriptTaskFileNameMapping = await getScriptTaskFileNameMapping(bpmnObj);

  await asyncForEach(
    Object.entries(scriptTaskFileNameMapping),
    async ([scriptTaskId, { fileName }]) => {
      if (fileName) {
        const [unversionedName] = fileName.split('-');
        changedScriptTaskFileNames[fileName] = unversionedName;
        await setScriptTaskData(bpmnObj, scriptTaskId, unversionedName);
      }
    },
  );

  return { bpmn: await toBpmnXml(bpmnObj), changedUserTaskFileNames, changedScriptTaskFileNames };
}

export async function getLocalVersionBpmn(process: Process, localVersion: string) {
  // early exit if there are no known versions for the process locally
  if (!Array.isArray(process.versions) || !process.versions.length) return;

  // check if the specific version exists locally and get its bpmn if it does
  if (process.versions.some(({ id }) => id === localVersion)) {
    const bpmn = getProcessVersionBpmn(process.id, localVersion);
    return bpmn;
  }
}

export async function versionUserTasks(
  processInfo: Process,
  newVersion: string,
  bpmnObj: object,
  dryRun = false,
) {
  const htmlMapping = await getUserTaskFileNameMapping(bpmnObj);
  const versionedUserTaskFilenames: string[] = [];
  const { versionCreatedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let userTaskId in htmlMapping) {
    const { fileName, implementation } = htmlMapping[userTaskId];

    // only version user tasks that use html
    if (fileName && implementation === getUserTaskImplementationString()) {
      let versionFileName = `${fileName}-${newVersion}`;

      // make sure the user task is using the correct data
      await setUserTaskData(
        bpmnObj,
        userTaskId,
        versionFileName,
        getUserTaskImplementationString(),
      );

      if (!dryRun) {
        const userTaskHtml = await getProcessUserTaskHtml(processInfo.id, fileName);
        const userTaskData = await getProcessUserTaskJSON(processInfo.id, fileName);
        await saveProcessUserTask(
          processInfo.id,
          versionFileName,
          userTaskData!,
          userTaskHtml!,
          versionCreatedOn,
        );
      }

      // update ref for the artifacts referenced by the versioned user task
      //const refIds = await updateArtifactRefVersionedUserTask(userTaskData!, versionFileName);
      versionedUserTaskFilenames.push(versionFileName);
    }
  }

  return versionedUserTaskFilenames;
}

export async function versionScriptTasks(
  processInfo: Process,
  newVersion: string,
  bpmnObj: object,
  dryRun = false,
) {
  const scriptMapping = await getScriptTaskFileNameMapping(bpmnObj);
  const versionedScriptTaskFilenames: string[] = [];
  const { versionCreatedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let scriptTaskId in scriptMapping) {
    const { fileName } = scriptMapping[scriptTaskId];

    // only handle script tasks that reference a file
    if (fileName) {
      let versionFileName = `${fileName}-${newVersion}`;

      // make sure the script task is using the correct data
      await setScriptTaskData(bpmnObj, scriptTaskId, versionFileName);

      // store the script task version if it didn't exist before
      if (!dryRun) {
        const scriptTaskJS = await getProcessScriptTaskScript(processInfo.id, fileName + '.js');
        const scriptTaskTS = await getProcessScriptTaskScript(processInfo.id, fileName + '.ts');

        await saveProcessScriptTask(
          processInfo.id,
          versionFileName + '.js',
          scriptTaskJS,
          versionCreatedOn,
        );
        await saveProcessScriptTask(
          processInfo.id,
          versionFileName + '.ts',
          scriptTaskTS,
          versionCreatedOn,
        );
      }

      // update ref for the artifacts referenced by the versioned script task
      versionedScriptTaskFilenames.push(versionFileName);
    }
  }
  return versionedScriptTaskFilenames;
}

export async function updateProcessVersionBasedOn(processInfo: Process, versionBasedOn: string) {
  if (processInfo?.bpmn) {
    const { versionId, description, name, versionCreatedOn } =
      await getDefinitionsVersionInformation(processInfo.bpmn);

    const bpmn = (await setDefinitionsVersionInformation(processInfo.bpmn, {
      versionId,
      versionDescription: description,
      versionName: name,
      versionBasedOn,
      versionCreatedOn,
    })) as string;

    await updateProcess(processInfo.id, { bpmn });
  }
}

const getUsedScriptTaskFileNames = async (bpmn: string) => {
  const userTaskFileNameMapping = await getScriptTaskFileNameMapping(bpmn);

  const fileNames = new Set<string>();

  Object.values(userTaskFileNameMapping).forEach(({ fileName }) => {
    if (fileName) {
      fileNames.add(fileName);
    }
  });

  return [...fileNames];
};

const getUsedUserTaskFileNames = async (bpmn: string) => {
  const userTaskFileNameMapping = await getUserTaskFileNameMapping(bpmn);

  const fileNames = new Set<string>();

  Object.values(userTaskFileNameMapping).forEach(({ fileName }) => {
    if (fileName) {
      fileNames.add(fileName);
    }
  });

  return [...fileNames];
};

export async function selectAsLatestVersion(processId: string, versionId: string) {
  const versionBpmn = (await getProcessVersionBpmn(processId, versionId)) as string;

  const {
    bpmn: convertedBpmn,
    changedScriptTaskFileNames,
    changedUserTaskFileNames,
  } = await convertToEditableBpmn(versionBpmn);

  const editableBpmn = (await getProcessBpmn(processId)) as string;

  const scriptFileNamesinEditableVersion = await getUsedScriptTaskFileNames(editableBpmn);

  // delete scripts stored for latest version
  await asyncForEach(scriptFileNamesinEditableVersion, async (taskFileName) => {
    await asyncForEach(['js', 'ts', 'xml'], async (type) => {
      await deleteProcessScriptTask(processId, taskFileName + '.' + type);
    });
  });

  // store ScriptTasks from this version as ScriptTasks from latest version
  await asyncForEach(Object.entries(changedScriptTaskFileNames), async ([oldName, newName]) => {
    for (const type of ['js', 'ts', 'xml']) {
      try {
        const fileContent = await getProcessScriptTaskScript(processId, oldName + '.' + type);
        await saveProcessScriptTask(processId, newName + '.' + type, fileContent);
      } catch (err) {}
    }
  });

  const userTaskFileNamesinEditableVersion = await getUsedUserTaskFileNames(editableBpmn);

  // Delete UserTasks stored for latest version
  await asyncForEach(userTaskFileNamesinEditableVersion, async (taskFileName) => {
    await deleteProcessUserTask(processId, taskFileName);
  });

  // Store UserTasks from this version as UserTasks from latest version
  await asyncForEach(Object.entries(changedUserTaskFileNames), async ([oldName, newName]) => {
    const json = await getProcessUserTaskJSON(processId, oldName);
    const html = await getProcessUserTaskHtml(processId, oldName);

    if (json && html) await saveProcessUserTask(processId, newName, json, html);
  });

  // Store bpmn from this version as latest version
  await updateProcess(processId, { bpmn: convertedBpmn });
}
