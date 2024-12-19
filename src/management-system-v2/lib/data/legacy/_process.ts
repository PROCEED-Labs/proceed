import { init as initFolders } from './folders';
import eventHandler from './eventHandler.js';
import store from './store.js';
import logger from './logging.js';
import {
  saveProcess,
  saveProcessVersion,
  deleteProcess,
  getImage,
  getImages,
  saveImage,
  deleteImage,
  getUserTaskIds,
  getUserTaskHTML,
  getUserTasksHTML,
  saveUserTaskHTML,
  deleteUserTaskHTML,
  getUserTaskJSON,
  getUserTasksJSON,
  saveUserTaskJSON,
  deleteUserTaskJSON,
  getBPMN,
  getProcessVersion,
  updateProcess as overwriteProcess,
  getUpdatedProcessesJSON,
  getImageFileNames,
  saveScriptTaskScript,
  getScriptTaskScript,
  getScriptTasksScript,
  deleteScriptTaskScript,
} from './fileHandling.js';
import { mergeIntoObject } from '../../helpers/javascriptHelpers';
import { getProcessInfo, getDefaultProcessMetaInfo } from '../../helpers/processHelpers';

import bpmnHelperEx from '@proceed/bpmn-helper';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { ProcessMetadata, ProcessServerInput, ProcessServerInputSchema } from '../process-schema';
import { foldersMetaObject, getRootFolder } from './folders';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { fromCustomUTCString, toCustomUTCString } from '@/lib/helpers/timeHelper';

let firstInit = false;
// @ts-ignore
if (!global.processMetaObjects) {
  firstInit = true;
}

let processMetaObjects: {
  [ProcessId: string]: Omit<ProcessMetadata, 'bpmn'>;
} =
  // @ts-ignore
  global.processMetaObjects || (global.processMetaObjects = {});

const { getDefinitionsVersionInformation } = bpmnHelperEx;

export function getProcessMetaObjects() {
  return processMetaObjects;
}

/** Returns all processes for a user */
export async function getProcesses(environmentId: string, ability?: Ability, includeBPMN = false) {
  const spaceProcesses = Object.values(processMetaObjects).filter(
    (process) => process.environmentId === environmentId,
  );

  const processes = ability ? ability.filter('view', 'Process', spaceProcesses) : spaceProcesses;

  if (!includeBPMN) return processes;
  return processes.map((process) => ({ ...process, bpmn: getProcessBpmn(process.id) }));
}

export async function getProcess(processDefinitionsId: string, includeBPMN = false) {
  const process = processMetaObjects[processDefinitionsId];
  if (!process) {
    throw new Error(`Process with id ${processDefinitionsId} could not be found!`);
  }

  const bpmn = includeBPMN ? await getProcessBpmn(processDefinitionsId) : null;
  return { ...process, bpmn };
}

/**
 * Throws if process with given id doesn't exist
 *
 * @param {String} processDefinitionsId
 */
export function checkIfProcessExists(processDefinitionsId: string) {
  if (!processMetaObjects[processDefinitionsId]) {
    throw new Error(`Process with id ${processDefinitionsId} does not exist!`);
  }
}

/** Handles adding a process, makes sure all necessary information gets parsed from bpmn */
export async function addProcess(processInput: ProcessServerInput & { bpmn: string }) {
  // const processData = ProcessInputSchema.parse(processInput) as OptionalKeys<ProcessInput, 'bpmn'>;
  const { bpmn } = processInput;

  const processData = ProcessServerInputSchema.parse(processInput);

  if (!bpmn) {
    throw new Error("Can't create a process without a bpmn!");
  }

  // create meta info object
  const metadata = {
    ...getDefaultProcessMetaInfo(),
    ...processData,
    ...(await getProcessInfo(bpmn)),
  };

  if (!metadata.folderId) {
    metadata.folderId = (await getRootFolder(metadata.environmentId)).id;
  }

  const folderData = foldersMetaObject.folders[metadata.folderId];
  if (!folderData) throw new Error('Folder not found');
  // TODO check folder permissions here, they're checked in movefolder,
  // but by then the folder was already created

  const { id: processDefinitionsId } = metadata;

  // check if there is an id collision
  if (processMetaObjects[processDefinitionsId]) {
    throw new Error(`A process with the id ${processDefinitionsId} already exists!`);
  }

  // save process info
  processMetaObjects[processDefinitionsId] = metadata;

  // write meta data to store
  store.add('processes', removeExcessiveInformation(metadata));
  // save bpmn
  await saveProcess(processDefinitionsId, bpmn);

  moveProcess({ processDefinitionsId, newFolderId: metadata.folderId, dontUpdateOldFolder: true });

  eventHandler.dispatch('processAdded', { process: metadata });

  return metadata;
}

/** Updates an existing process with the given bpmn */
export async function updateProcess(
  processDefinitionsId: string,
  newInfoInput: Partial<ProcessServerInput> & { bpmn?: string },
) {
  const { bpmn: newBpmn } = newInfoInput;

  const newInfo = ProcessServerInputSchema.partial().parse(newInfoInput);
  checkIfProcessExists(processDefinitionsId);
  const currentParent = processMetaObjects[processDefinitionsId].folderId;

  let metaChanges = {
    ...newInfo,
  };

  if (newBpmn) {
    // get new info from bpmn
    metaChanges = {
      ...metaChanges,
      ...(await getProcessInfo(newBpmn)),
    };
  }

  // Update folders
  if (metaChanges.folderId && metaChanges.folderId !== currentParent) {
    moveProcess({ processDefinitionsId, newFolderId: metaChanges.folderId });
    delete metaChanges.folderId;
  }

  const newMetaData = await updateProcessMetaData(processDefinitionsId, metaChanges);

  if (newBpmn) {
    await overwriteProcess(processDefinitionsId, newBpmn);

    eventHandler.dispatch('backend_processXmlChanged', {
      definitionsId: processDefinitionsId,
      newXml: newBpmn,
    });
  }

  return newMetaData;
}

export function moveProcess({
  processDefinitionsId,
  newFolderId,
  ability,
  dontUpdateOldFolder = false,
}: {
  processDefinitionsId: string;
  newFolderId: string;
  dontUpdateOldFolder?: boolean;
  ability?: Ability;
}) {
  // Checks
  const process = processMetaObjects[processDefinitionsId];
  if (!process) throw new Error('Process not found');

  const folderData = foldersMetaObject.folders[newFolderId];
  if (!folderData) throw new Error('Folder not found');

  if (
    ability &&
    // no need to check folder permissions of parent, since the permissions on the process derive from it
    !ability.can('update', toCaslResource('Process', process)) &&
    !ability.can('update', toCaslResource('Folder', folderData.folder))
  )
    throw new UnauthorizedError();

  if (!dontUpdateOldFolder) {
    const oldFolder = foldersMetaObject.folders[process.folderId];
    if (!oldFolder) throw new Error("Consistency Error: Process' folder not found");
    const processOldFolderIdx = oldFolder.children.findIndex(
      (item) => 'type' in item && item.type === 'process' && item.id === processDefinitionsId,
    );
    if (processOldFolderIdx === -1)
      throw new Error('Consistensy Error: Process not found in folder');

    oldFolder.children.splice(processOldFolderIdx as number, 1);
  }

  folderData.children.push({ id: process.id, type: process.type });
  process.folderId = newFolderId;

  store.update('processes', processDefinitionsId, removeExcessiveInformation(process));
}

/** Direct updates to process meta data, should mostly be used for internal changes (puppeteer client, electron) to avoid
 * parsing the bpmn unnecessarily */
export async function updateProcessMetaData(
  processDefinitionsId: string,
  metaChanges: Partial<Omit<ProcessMetadata, 'bpmn'>>,
) {
  checkIfProcessExists(processDefinitionsId);

  const newMetaData = {
    ...processMetaObjects[processDefinitionsId],
    lastEdited: new Date().toUTCString(),
  };

  mergeIntoObject(newMetaData, metaChanges, true, true, true);

  processMetaObjects[processDefinitionsId] = newMetaData;

  store.update('processes', processDefinitionsId, removeExcessiveInformation(newMetaData));

  eventHandler.dispatch('processUpdated', {
    oldId: processDefinitionsId,
    updatedInfo: newMetaData,
  });

  return newMetaData;
}

/** Removes an existing process */
export async function removeProcess(processDefinitionsId: string) {
  const process = processMetaObjects[processDefinitionsId];

  if (!process) {
    return;
  }

  // remove process from frolder
  foldersMetaObject.folders[process.folderId]!.children = foldersMetaObject.folders[
    process.folderId
  ]!.children.filter((folder) => folder.id !== processDefinitionsId);
  // remove process directory
  deleteProcess(processDefinitionsId);

  // remove from store
  store.remove('processes', processDefinitionsId);
  delete processMetaObjects[processDefinitionsId];
  eventHandler.dispatch('processRemoved', { processDefinitionsId });
}

/** Stores a new version of an existing process */
export async function addProcessVersion(processDefinitionsId: string, bpmn: string) {
  // get the version from the given bpmn
  let versionInformation = await getDefinitionsVersionInformation(bpmn);

  if (!versionInformation) {
    throw new Error('The given bpmn does not contain a version.');
  }

  const existingProcess = processMetaObjects[processDefinitionsId];
  if (!existingProcess) {
    // TODO: create the process and use the given version as the "HEAD"
    throw new Error('The process for which you try to create a version does not exist');
  }

  if (
    existingProcess.type !== 'project' &&
    (!versionInformation.name || !versionInformation.description)
  ) {
    throw new Error(
      'A bpmn that should be stored as a version of a process has to contain both a version name and a version description!',
    );
  }

  // don't add a version a second time
  if (
    existingProcess.versions.some(
      ({ createdOn }) => toCustomUTCString(createdOn) == versionInformation.versionCreatedOn,
    )
  ) {
    return;
  }

  // save the new version in the directory of the process

  const versionCreatedOn = versionInformation.versionCreatedOn || toCustomUTCString(new Date());

  await saveProcessVersion(processDefinitionsId, versionCreatedOn, bpmn);

  // add information about the new version to the meta information and inform others about its existence
  const newVersions = existingProcess.versions ? [...existingProcess.versions] : [];

  newVersions.push({
    id: versionInformation.versionId!,
    createdOn: fromCustomUTCString(versionCreatedOn),
    description: versionInformation.description!,
    name: versionInformation.name!,
    versionBasedOn: versionInformation.versionBasedOn,
  });
  newVersions.sort((a, b) => (b.createdOn > a.createdOn ? 1 : -1));

  await updateProcessMetaData(processDefinitionsId, { versions: newVersions });
}

/** Returns the bpmn of a specific process version */
export function getProcessVersionBpmn(processDefinitionsId: string, versionId: string) {
  let existingProcess = processMetaObjects[processDefinitionsId];
  if (!existingProcess) {
    throw new Error('The process for which you try to get a version does not exist');
  }

  const existingVersion = existingProcess.versions?.find(
    (existingVersionInfo) => existingVersionInfo.id === versionId,
  );

  if (!existingVersion) {
    throw new Error('The version you are trying to get does not exist');
  }

  return getProcessVersion(processDefinitionsId, toCustomUTCString(existingVersion.createdOn));
}

/** Removes information from the meta data that would not be correct after a restart */
function removeExcessiveInformation(processInfo: Omit<ProcessMetadata, 'bpmn'>) {
  const newInfo = { ...processInfo };
  delete newInfo.inEditingBy;
  return newInfo;
}

/** Returns the process definition for the process with the given id */
export function getProcessBpmn(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const bpmn = getBPMN(processDefinitionsId);
    return bpmn;
  } catch (err) {
    logger.debug(`Error reading bpmn of process. Reason:\n${err}`);
    throw new Error('Unable to find process bpmn!');
  }
}

/** Returns the filenames of the data for all user tasks in the given process */
export async function getProcessUserTasks(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    return await getUserTaskIds(processDefinitionsId);
  } catch (err) {
    logger.debug(`Error reading user task ids. Reason:\n${err}`);
    throw new Error('Unable to read user task filenames');
  }
}

/** Returns the form data for a specific user task in a process */
export async function getProcessUserTaskJSON(processDefinitionsId: string, taskFileName: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    return getUserTaskJSON(processDefinitionsId, taskFileName);
  } catch (err) {
    logger.debug(`Error getting data of user task. Reason:\n${err}`);
    throw new Error('Unable to get data for user task!');
  }
}

/** Returns the html for a specific user task in a process */
export async function getProcessUserTaskHtml(processDefinitionsId: string, taskFileName: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    return getUserTaskHTML(processDefinitionsId, taskFileName);
  } catch (err) {
    logger.debug(`Error getting html of user task. Reason:\n${err}`);
    throw new Error('Unable to get html for user task!');
  }
}

/** Return object mapping from user tasks fileNames to their form data */
export async function getProcessUserTasksJSON(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    return getUserTasksJSON(processDefinitionsId);
  } catch (err) {
    logger.debug(`Error getting user task data. Reason:\n${err}`);
    throw new Error('Failed getting data for all user tasks');
  }
}

/** Return object mapping from user tasks fileNames to their html */
export async function getProcessUserTasksHtml(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    return await getUserTasksHTML(processDefinitionsId);
  } catch (err) {
    logger.debug(`Error getting user task html. Reason:\n${err}`);
    throw new Error('Failed getting html for all user tasks');
  }
}

export async function saveProcessUserTask(
  processDefinitionsId: string,
  userTaskFileName: string,
  json: string,
  html: string,
) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await saveUserTaskJSON(processDefinitionsId, userTaskFileName, json);
    await saveUserTaskHTML(processDefinitionsId, userTaskFileName, html);
  } catch (err) {
    logger.debug(`Error storing user task data. Reason:\n${err}`);
    throw new Error('Failed to store the user task data');
  }
}

/** Removes a stored user task from disk */
export async function deleteProcessUserTask(
  processDefinitionsId: string,
  userTaskFileName: string,
) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await deleteUserTaskJSON(processDefinitionsId, userTaskFileName);
    await deleteUserTaskHTML(processDefinitionsId, userTaskFileName);
  } catch (err) {
    logger.debug(`Error removing user task data. Reason:\n${err}`);
  }
}

/** Returns the script for a specific script task in a process */
export async function getProcessScriptTaskScript(
  processDefinitionsId: string,
  taskFileNameWithExtension: string,
) {
  checkIfProcessExists(processDefinitionsId);

  try {
    return getScriptTaskScript(processDefinitionsId, taskFileNameWithExtension);
  } catch (err) {
    logger.debug(`Error getting data of script task. Reason:\n${err}`);
    throw new Error('Unable to get data for script task!');
  }
}

/** Return object mapping from script tasks fileNames to their script */
export async function getProcessScriptTasksScript(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    return getScriptTasksScript(processDefinitionsId);
  } catch (err) {
    logger.debug(`Error getting script task data. Reason:\n${err}`);
    throw new Error('Failed getting data for all script tasks');
  }
}

export async function saveProcessScriptTask(
  processDefinitionsId: string,
  taskFileNameWithExtension: string,
  script: string,
) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await saveScriptTaskScript(processDefinitionsId, taskFileNameWithExtension, script);
  } catch (err) {
    logger.debug(`Error storing user task data. Reason:\n${err}`);
    throw new Error('Failed to store the user task data');
  }
}

/** Removes a stored script task from disk */
export async function deleteProcessScriptTask(
  processDefinitionsId: string,
  taskFileNameWithExtension: string,
) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await deleteScriptTaskScript(processDefinitionsId, taskFileNameWithExtension);
  } catch (err) {
    logger.debug(`Error removing script task data. Reason:\n${err}`);
  }
}

export async function getProcessImage(processDefinitionsId: string, imageFileName: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const image = await getImage(processDefinitionsId, imageFileName);

    return image;
  } catch (err) {
    logger.debug(`Error getting image. Reason:\n${err}`);
    throw new Error('Unable to get image!');
  }
}

/** Return Array with fileNames of images for given process */
export async function getProcessImageFileNames(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const imageFilenames = await getImageFileNames(processDefinitionsId);
    return imageFilenames;
  } catch (err) {
    logger.debug(`Error getting image filenames. Reason:\n${err}`);
    throw new Error('Failed getting all image filenames in process');
  }
}

/** Return object mapping from images fileNames to their image */
export async function getProcessImages(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const images = await getImages(processDefinitionsId);
    return images;
  } catch (err) {
    logger.debug(`Error getting images. Reason:\n${err}`);
    throw new Error('Failed getting all images in process');
  }
}

export async function saveProcessImage(
  processDefinitionsId: string,
  imageFileName: string,
  image: Buffer,
) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await saveImage(processDefinitionsId, imageFileName, image);
    eventHandler.dispatch('backend_processImageChanged', {
      processDefinitionsId,
      imageFileName,
      image,
    });
  } catch (err) {
    logger.debug(`Error storing image. Reason:\n${err}`);
    throw new Error('Failed to store image');
  }
}

export async function deleteProcessImage(processDefinitionsId: string, imageFileName: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await deleteImage(processDefinitionsId, imageFileName);
  } catch (err) {
    logger.debug(`Error deleting image. Reason:\n${err}`);
    throw new Error('Failed to delete image');
  }
}

/** Stores the id of the socket wanting to block the process from being deleted inside the process object */
export function blockProcess(socketId: string, processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  const process = { ...processMetaObjects[processDefinitionsId] };

  const blocker = { id: socketId, task: undefined };
  let { inEditingBy } = process;
  if (!inEditingBy) {
    inEditingBy = [blocker];
  } else {
    const existingBlocker = inEditingBy.find((b) => b.id == blocker.id);
    if (!existingBlocker) {
      inEditingBy.push(blocker);
    }
  }
  updateProcessMetaData(processDefinitionsId, { inEditingBy });
}

/** Removes the id of the socket wanting to unblock the process from the process object */
export function unblockProcess(socketId: string, processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  const process = processMetaObjects[processDefinitionsId];

  if (!process.inEditingBy) {
    return;
  }

  const inEditingBy = process.inEditingBy.filter((blocker) => blocker.id !== socketId);

  updateProcessMetaData(processDefinitionsId, { inEditingBy });
}

export function blockTask(socketId: string, processDefinitionsId: string, taskId: string) {
  checkIfProcessExists(processDefinitionsId);

  const process = processMetaObjects[processDefinitionsId];

  if (!process.inEditingBy) {
    return;
  }

  let blocker = process.inEditingBy.find((b) => b.id === socketId);

  let { inEditingBy } = process;

  if (!blocker) {
    blocker = { id: socketId, task: taskId };
    inEditingBy.push(blocker);
  } else {
    blocker.task = taskId;
  }

  updateProcessMetaData(processDefinitionsId, { inEditingBy });
}

export function unblockTask(socketId: string, processDefinitionsId: string, taskId: string) {
  checkIfProcessExists(processDefinitionsId);

  const process = processMetaObjects[processDefinitionsId];

  if (!process.inEditingBy) {
    return;
  }

  let blocker = process.inEditingBy.find((b) => b.id === socketId);

  if (blocker && blocker.task === taskId) {
    blocker.task = undefined;

    updateProcessMetaData(processDefinitionsId, { inEditingBy: process.inEditingBy });
  }
}

/** Will remove all instance adaptation processes that are stored */
function removeAdaptationProcesses(processes: ProcessMetadata[]) {
  for (const process of processes) {
    // delete the process data if it is an adaptation process
    if (process.type === 'process-instance') {
      deleteProcess(process.id);
    }
  }

  return processes.filter((p) => p.type !== 'process-instance');
}

let inited = false;
/**
 * initializes the process meta information objects
 */
export async function init() {
  // Avoids recreating the processMetaObjects in server actions' module scope if they already exist.
  if (!firstInit || inited) return;

  inited = true;

  // folder init can change processes, so it has to be called first
  initFolders();

  // get processes that were persistently stored
  const storedProcesses = store.get('processes');
  let updatedProcesses = (await getUpdatedProcessesJSON(storedProcesses)) as ProcessMetadata[];

  // remove all adaptation process that might still be stored for some reason
  updatedProcesses = removeAdaptationProcesses(updatedProcesses);

  store.set('processes', 'processes', updatedProcesses);
  const processes = updatedProcesses.map((uP) => ({ ...uP, inEditingBy: [] }));
  processes.forEach((process) => (processMetaObjects[process.id] = process));
}
