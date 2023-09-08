import { processInterface } from '@/frontend/backend-api/index.js';

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

import { areVersionsEqual } from '@/shared-frontend-backend/helpers/processVersioning.js';

async function getLocalVersionBpmn(store, process, localVersion) {
  // early exit if there are no known versions for the process locally
  if (!Array.isArray(process.versions) || !process.versions.length) return;

  // check if the specific version exists locally and get its bpmn if it does
  if (process.versions.some(({ version }) => version == localVersion)) {
    return await store.getters['processStore/xmlByVersion'](process.id, localVersion);
  }
}

async function versionUserTasks(store, processInfo, newVersion, bpmnObj, dryRun) {
  const htmlMapping = await getUserTaskFileNameMapping(bpmnObj);

  const userTasksHtml = await store.getters['processStore/htmlMappingById'](processInfo.id);

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  for (let userTaskId in htmlMapping) {
    // only version user tasks that use html
    if (htmlMapping[userTaskId].implementation === getUserTaskImplementationString()) {
      const html = userTasksHtml[htmlMapping[userTaskId].fileName];

      let fileName = `${htmlMapping[userTaskId].fileName}-${newVersion}`;

      // get the html of the user task in the based on version (if there is one and it is locally known)
      const basedOnBPMN = await getLocalVersionBpmn(store, processInfo, versionBasedOn);

      // check if there is a preceding version and if the html of the user task actually changed from that version
      if (basedOnBPMN) {
        const basedOnVersionHtmlMapping = await getUserTaskFileNameMapping(basedOnBPMN);

        // check if the user task existed and if it had the same html
        const basedOnVersionFileInfo = basedOnVersionHtmlMapping[userTaskId];
        if (basedOnVersionFileInfo && userTasksHtml[basedOnVersionFileInfo.fileName] === html) {
          // reuse the html of the previous version
          fileName = basedOnVersionFileInfo.fileName;
        }
      }

      // make sure the user task is using the correct data
      await setUserTaskData(bpmnObj, userTaskId, fileName, getUserTaskImplementationString());

      // store the user task version if it didn't exist before
      if (!dryRun && !userTasksHtml[fileName]) {
        await store.dispatch('processStore/saveUserTask', {
          processDefinitionsId: processInfo.id,
          taskFileName: fileName,
          html,
        });
      }
    }
  }
}

export async function processHeadDiffersFromBasedOn(store, definitionId) {
  const processInfo = store.getters['processStore/processes'].find(
    (process) => process.id === definitionId,
  );

  if (!processInfo) {
    throw new Error("Can't check version changes for an unknown process");
  }

  const headBpmn = await store.getters['processStore/xmlById'](definitionId);
  const headBpmnObj = await toBpmnObject(headBpmn);
  // there is no based on version yet => return true
  const { versionBasedOn } = await getDefinitionsVersionInformation(headBpmnObj);
  if (!versionBasedOn) {
    return true;
  }

  // set the user tasks fileNames as they would be if we were creating a new version (to see if they would differ from the based on version)
  const epochTime = +new Date();
  await versionUserTasks(store, processInfo, epochTime, headBpmnObj, true);

  const versionedHeadBpmn = await toBpmnXml(headBpmnObj);

  // return if the new version has changes to the version it is based on
  const basedOnBpmn = await getLocalVersionBpmn(store, processInfo, versionBasedOn);

  // early exit if the based on process is not locally known => we consider it different
  if (!basedOnBpmn) {
    return true;
  }

  return !(await areVersionsEqual(versionedHeadBpmn, basedOnBpmn));
}

export async function createNewProcessVersion(store, bpmn, versionName, versionDescription) {
  const bpmnObj = await toBpmnObject(bpmn);
  const definitionId = await getDefinitionsId(bpmnObj);

  const processInfo = store.getters['processStore/processes'].find(
    (process) => process.id === definitionId,
  );

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

  await versionUserTasks(store, processInfo, epochTime, bpmnObj);

  const versionedBpmn = await toBpmnXml(bpmnObj);

  // if the new version has no changes to the version it is based on don't create a new version and return the previous version
  const basedOnBPMN = await getLocalVersionBpmn(store, processInfo, versionBasedOn);
  if (basedOnBPMN && (await areVersionsEqual(versionedBpmn, basedOnBPMN))) {
    return versionBasedOn;
  }

  // send final process version bpmn to the backend
  await store.dispatch('processStore/addVersion', {
    id: definitionId,
    bpmn: versionedBpmn,
  });

  await processInterface.updateProcessVersionBasedOn(definitionId, epochTime);

  return epochTime;
}
