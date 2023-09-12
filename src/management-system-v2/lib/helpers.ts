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

import { createVersion, saveUserTask, updateProcess } from './update-data';
import { Process, fetchProcess, fetchProcessVersion, fetchUserTaskHTML } from './fetch-data';

const { diff } = require('bpmn-js-differ');

/**
 * Will compare two bpmns to check if both are equal (with possible differences in their versions)
 *
 * @param {string} bpmn
 * @param {string} otherBpmn
 * @returns {boolean}
 */
async function areVersionsEqual(bpmn: string, otherBpmn: string) {
  const bpmnObj = await toBpmnObject(bpmn);
  const otherBpmnObj = await toBpmnObject(otherBpmn);

  const {
    version,
    name: versionName,
    description: versionDescription,
    versionBasedOn,
  } = await getDefinitionsVersionInformation(otherBpmnObj);

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

async function getLocalVersionBpmn(process: Process, localVersion: number) {
  // early exit if there are no known versions for the process locally
  if (!Array.isArray(process.versions) || !process.versions.length) return;

  // check if the specific version exists locally and get its bpmn if it does
  if (process.versions.some(({ version }) => version == localVersion)) {
    return fetchProcessVersion(process.definitionId, localVersion);
  }
}

async function versionUserTasks(
  processInfo: Process,
  newVersion: number,
  bpmnObj: object,
  dryRun = false,
) {
  const htmlMapping = await getUserTaskFileNameMapping(bpmnObj);

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let userTaskId in htmlMapping) {
    // only version user tasks that use html
    if (htmlMapping[userTaskId].implementation === getUserTaskImplementationString()) {
      const html = await fetchUserTaskHTML(
        processInfo.definitionId,
        htmlMapping[userTaskId].fileName,
      );

      let fileName = `${htmlMapping[userTaskId].fileName}-${newVersion}`;

      // get the html of the user task in the based on version (if there is one and it is locally known)
      const basedOnBPMN = await getLocalVersionBpmn(processInfo, versionBasedOn);

      // check if there is a preceding version and if the html of the user task actually changed from that version
      let userTaskHtmlAlreadyExisting = false;
      if (basedOnBPMN) {
        const basedOnVersionHtmlMapping = await getUserTaskFileNameMapping(basedOnBPMN);

        // check if the user task existed and if it had the same html
        const basedOnVersionFileInfo = basedOnVersionHtmlMapping[userTaskId];
        const basedOnVersionUserTaskHTML = await fetchUserTaskHTML(
          processInfo.definitionId,
          basedOnVersionFileInfo.fileName,
        );
        if (basedOnVersionFileInfo && basedOnVersionUserTaskHTML === html) {
          // reuse the html of the previous version
          userTaskHtmlAlreadyExisting = true;
          fileName = basedOnVersionFileInfo.fileName;
        }
      }

      // make sure the user task is using the correct data
      await setUserTaskData(bpmnObj, userTaskId, fileName, getUserTaskImplementationString());

      // store the user task version if it didn't exist before
      if (!dryRun && !userTaskHtmlAlreadyExisting) {
        await saveUserTask(processInfo.definitionId, fileName, html);
      }
    }
  }
}

export async function createNewProcessVersion(
  bpmn: string,
  versionName: string,
  versionDescription: string,
) {
  const bpmnObj = await toBpmnObject(bpmn);
  const definitionId = await getDefinitionsId(bpmnObj);

  const processInfo = await fetchProcess(definitionId);

  if (!processInfo) {
    throw new Error("Can't create a new version for an unknown process");
  }

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  // add process version to bpmn
  const epochTime = +new Date();
  await setDefinitionsVersionInformation(bpmnObj, {
    version: epochTime,
    versionName,
    versionDescription,
    versionBasedOn,
  });

  await versionUserTasks(processInfo, epochTime, bpmnObj);

  const versionedBpmn = await toBpmnXml(bpmnObj);

  // if the new version has no changes to the version it is based on don't create a new version and return the previous version
  const basedOnBPMN = await getLocalVersionBpmn(processInfo, versionBasedOn);
  if (basedOnBPMN && (await areVersionsEqual(versionedBpmn, basedOnBPMN))) {
    return versionBasedOn;
  }

  // send final process version bpmn to the backend
  const response = await createVersion(definitionId, { bpmn: versionedBpmn });

  // update versionBasedOn property on original process
  await updateProcessVersionBasedOn(definitionId, epochTime);

  return epochTime;
}

async function updateProcessVersionBasedOn(processDefinitionsId: string, versionBasedOn: number) {
  const processInfo = await fetchProcess(processDefinitionsId);

  if (processInfo.bpmn) {
    const versionInformation = await getDefinitionsVersionInformation(processInfo.bpmn);
    const bpmn = await setDefinitionsVersionInformation(processInfo.bpmn, {
      ...versionInformation,
      versionBasedOn,
    });
    updateProcess(processDefinitionsId, { bpmn });
  }
}
