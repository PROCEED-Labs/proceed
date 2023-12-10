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
  getBPMN,
  getProcessVersion,
  updateProcess as overwriteProcess,
  getUpdatedProcessesJSON,
  getImageFileNames,
} from './fileHandling.js';
import { mergeIntoObject } from '../../helpers/javascriptHelpers';
import { getProcessInfo, getDefaultProcessMetaInfo } from '../../helpers/processHelpers';
import { ApiData } from '@/lib/fetch-data';

import bpmnHelperEx from '@proceed/bpmn-helper';

let firstInit = false;
if (!global.processMetaObjects) {
  firstInit = true;
}
let processMetaObjects = global.processMetaObjects || (global.processMetaObjects = {});

const { getDefinitionsVersionInformation } = bpmnHelperEx;

export function getProcessMetaObjects() {
  return processMetaObjects;
}

/**
 * Returns a process DTO for the given process id.
 *
 * @returns {ApiData<'/process/{definitionId}', 'get'>}
 */
export function toExternalFormat(processMetaData) {
  const newFormat = { ...processMetaData };
  newFormat.definitionId = processMetaData.id;
  newFormat.definitionName = processMetaData.name;
  delete newFormat.id;
  delete newFormat.name;
  return newFormat;
}

/**
 * Returns all processes for a user
 *
 * @returns {Promise<ApiData<'/process', 'get'>>}
 */
export async function getProcesses(ability, includeBPMN = false) {
  const processes = Object.values(processMetaObjects);

  const userProcesses = await Promise.all(
    ability
      .filter('view', 'Process', processes)
      .map(async (process) =>
        toExternalFormat(
          !includeBPMN ? process : { ...process, bpmn: await getProcessBpmn(process.id) },
        ),
      ),
  );

  return userProcesses;
}

export async function getProcess(processDefinitionsId, includeBPMN = false) {
  const process = processMetaObjects[processDefinitionsId];

  if (!process) {
    throw new Error(`Process with id ${processDefinitionsId} could not be found!`);
  }

  const bpmn = includeBPMN ? await getProcessBpmn(processDefinitionsId) : null;
  return toExternalFormat({ ...process, bpmn });
}

/**
 * Throws if process with given id doesn't exist
 *
 * @param {String} processDefinitionsId
 */
export function checkIfProcessExists(processDefinitionsId) {
  if (!processMetaObjects[processDefinitionsId]) {
    throw new Error(`Process with id ${processDefinitionsId} does not exist!`);
  }
}

/**
 * Handles adding a process, makes sure all necessary information gets parsed from bpmn
 *
 * @param {String} bpmn the xml description of the process to create
 * @returns {Promise<Object|string>} - returns an object containing the intitial process information or its id if a process with the same id already exists
 */
export async function addProcess(processData) {
  const { bpmn } = processData;
  delete processData.bpmn;

  if (!bpmn) {
    throw new Error("Can't create a process without a bpmn!");
  }

  // create meta info object
  const metadata = {
    ...getDefaultProcessMetaInfo(),
    ...processData,
    ...(await getProcessInfo(bpmn)),
  };

  const { id: processDefinitionsId } = metadata;

  // check if there is an id collision
  if (processMetaObjects[processDefinitionsId]) {
    return processDefinitionsId;
  }

  // save process info
  processMetaObjects[processDefinitionsId] = metadata;
  // write meta data to store
  store.add('processes', removeExcessiveInformation(metadata));
  // save bpmn
  await saveProcess(processDefinitionsId, bpmn);

  eventHandler.dispatch('processAdded', { process: metadata });

  return metadata;
}

/**
 * Updates an existing process with the given bpmn
 *
 * @param {String} processDefinitionsId
 * @param {String} newBpmn
 * @returns {Promise<Object>} - contains the new process meta information
 */
export async function updateProcess(processDefinitionsId, newInfo) {
  checkIfProcessExists(processDefinitionsId);

  const { bpmn: newBpmn } = newInfo;
  delete newInfo.bpmn;

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

/**
 * Direct updates to process meta data, should mostly be used for internal changes (puppeteer client, electron) to avoid
 * parsing the bpmn unnecessarily
 *
 * @param {Object} processDefinitionsId
 * @param {Object} metaChanges contains the elements to change and their new values
 */
export async function updateProcessMetaData(processDefinitionsId, metaChanges) {
  checkIfProcessExists(processDefinitionsId);

  const { id: newId } = metaChanges;

  if (newId && processDefinitionsId !== newId) {
    throw new Error(`Illegal try to change id from ${processDefinitionsId} to ${newId}`);
  }

  const newMetaData = {
    ...processMetaObjects[processDefinitionsId],
    lastEdited: new Date().toUTCString(),
  };

  mergeIntoObject(newMetaData, metaChanges, true, true, true);

  // add shared_with if process is shared
  if (metaChanges.shared_with) {
    newMetaData.shared_with = metaChanges.shared_with;
  }

  // remove shared_with if not shared anymore
  if (newMetaData.shared_with && metaChanges.shared_with && metaChanges.shared_with.length === 0) {
    delete newMetaData.shared_with;
  }

  processMetaObjects[processDefinitionsId] = newMetaData;

  store.update('processes', processDefinitionsId, removeExcessiveInformation(newMetaData));

  eventHandler.dispatch('processUpdated', {
    oldId: processDefinitionsId,
    updatedInfo: newMetaData,
  });

  return newMetaData;
}

/**
 * Removes an existing process
 *
 * @param {String} processDefinitionsId
 */
export async function removeProcess(processDefinitionsId) {
  if (!processMetaObjects[processDefinitionsId]) {
    return;
  }

  // remove process directory
  await deleteProcess(processDefinitionsId);
  // remove from store
  store.remove('processes', processDefinitionsId);
  delete processMetaObjects[processDefinitionsId];

  eventHandler.dispatch('processRemoved', { processDefinitionsId });
}

/**
 * Stores a new version of an existing process
 *
 * @param {String} processDefinitionsId
 * @param {String} bpmn
 */
export async function addProcessVersion(processDefinitionsId, bpmn) {
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
  if (existingProcess.versions.some(({ version }) => version == versionInformation.version)) {
    return;
  }

  // save the new version in the directory of the process
  await saveProcessVersion(processDefinitionsId, versionInformation.version, bpmn);

  // add information about the new version to the meta information and inform others about its existance
  const newVersions = existingProcess.versions ? [...existingProcess.versions] : [];

  newVersions.push(versionInformation);
  newVersions.sort((a, b) => b.version - a.version);

  await updateProcessMetaData(processDefinitionsId, { versions: newVersions });
}

/**
 * Returns the bpmn of a specific process version
 *
 * @param {String} processDefinitionsId
 * @param {String} version
 * @returns {Promise<string>} the bpmn of the specific process version
 */
export async function getProcessVersionBpmn(processDefinitionsId, version) {
  let existingProcess = processMetaObjects[processDefinitionsId];
  if (!existingProcess) {
    throw new Error('The process for which you try to get a version does not exist');
  }

  if (
    !existingProcess.versions ||
    !existingProcess.versions.some((existingVersionInfo) => existingVersionInfo.version == version)
  ) {
    throw new Error('The version you are trying to get does not exist');
  }

  return await getProcessVersion(processDefinitionsId, version);
}

/**
 * Removes information from the meta data that would not be correct after a restart
 *
 * @param {Object} processInfo the complete process meta information
 */
function removeExcessiveInformation(processInfo) {
  const newInfo = { ...processInfo };
  delete newInfo.inEditingBy;
  return newInfo;
}

/**
 * Returns the process definition for the process with the given id
 *
 * @param {String} processDefinitionsId
 * @returns {Promise<String>} - the process definition
 */
export async function getProcessBpmn(processDefinitionsId) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const bpmn = await getBPMN(processDefinitionsId);
    return bpmn;
  } catch (err) {
    logger.debug(`Error reading bpmn of process. Reason:\n${err}`);
    throw new Error('Unable to find process bpmn!');
  }
}

/**
 * Returns the filenames of html data for all user tasks in the given process
 *
 * @param {String} processDefinitionsId
 * @returns {Array} - array containing the filenames of the htmls of all user tasks in the process
 */
export async function getProcessUserTasks(processDefinitionsId) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const userTaskIds = await getUserTaskIds(processDefinitionsId);
    return userTaskIds;
  } catch (err) {
    logger.debug(`Error reading user task ids. Reason:\n${err}`);
    throw new Error('Unable to read user task filenames');
  }
}

/**
 * Returns the html for a specific user task in a process
 *
 * @param {String} processDefinitionsId
 * @param {String} taskFileName
 * @returns {String} - the html under the given fileName
 */
export async function getProcessUserTaskHtml(processDefinitionsId, taskFileName) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const userTaskHtml = await getUserTaskHTML(processDefinitionsId, taskFileName);
    return userTaskHtml;
  } catch (err) {
    logger.debug(`Error getting html of user task. Reason:\n${err}`);
    throw new Error('Unable to get html for user task!');
  }
}

/**
 * Return object mapping from user tasks fileNames to their html
 *
 * @param {String} processDefinitionsId
 * @returns {Object} - contains the html for all user tasks in the process
 */
export async function getProcessUserTasksHtml(processDefinitionsId) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const userTasksHtml = await getUserTasksHTML(processDefinitionsId);
    return userTasksHtml;
  } catch (err) {
    logger.debug(`Error getting user task html. Reason:\n${err}`);
    throw new Error('Failed getting html for all user tasks');
  }
}

export async function saveProcessUserTask(processDefinitionsId, userTaskFileName, html) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await saveUserTaskHTML(processDefinitionsId, userTaskFileName, html);
    eventHandler.dispatch('backend_processTaskHtmlChanged', {
      processDefinitionsId,
      userTaskFileName,
      html,
    });
  } catch (err) {
    logger.debug(`Error storing user task data. Reason:\n${err}`);
    throw new Error('Failed to store the user task data');
  }
}

/**
 * Removes a stored user task from disk
 *
 * @param {String} processDefinitionsId
 * @param {String} userTaskFileName
 */
export async function deleteProcessUserTask(processDefinitionsId, userTaskFileName) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await deleteUserTaskHTML(processDefinitionsId, userTaskFileName);
    eventHandler.dispatch('backend_processTaskHtmlChanged', {
      processDefinitionsId,
      userTaskFileName,
    });
  } catch (err) {
    logger.debug(`Error removing user task html. Reason:\n${err}`);
  }
}

export async function getProcessImage(processDefinitionsId, imageFileName) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const image = await getImage(processDefinitionsId, imageFileName);

    return image;
  } catch (err) {
    logger.debug(`Error getting image. Reason:\n${err}`);
    throw new Error('Unable to get image!');
  }
}

/**
 * Return Array with fileNames of images for given process
 *
 * @param {String} processDefinitionsId
 * @returns {Promise<string[]>} - contains all image fileNames in the process
 */
export async function getProcessImageFileNames(processDefinitionsId) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const imageFilenames = await getImageFileNames(processDefinitionsId);
    return imageFilenames;
  } catch (err) {
    logger.debug(`Error getting image filenames. Reason:\n${err}`);
    throw new Error('Failed getting all image filenames in process');
  }
}

/**
 * Return object mapping from images fileNames to their image
 *
 * @param {String} processDefinitionsId
 * @returns {Promise<object>} - contains all images in the process
 */
export async function getProcessImages(processDefinitionsId) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const images = await getImages(processDefinitionsId);
    return images;
  } catch (err) {
    logger.debug(`Error getting images. Reason:\n${err}`);
    throw new Error('Failed getting all images in process');
  }
}

export async function saveProcessImage(processDefinitionsId, imageFileName, image) {
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

export async function deleteProcessImage(processDefinitionsId, imageFileName) {
  checkIfProcessExists(processDefinitionsId);

  try {
    await deleteImage(processDefinitionsId, imageFileName);
  } catch (err) {
    logger.debug(`Error deleting image. Reason:\n${err}`);
    throw new Error('Failed to delete image');
  }
}

/**
 * Stores the id of the socket wanting to block the process from being deleted inside the process object
 *
 * @param {String} socketId
 * @param {String} processDefinitionsId
 */
export function blockProcess(socketId, processDefinitionsId) {
  checkIfProcessExists(processDefinitionsId);

  const process = { ...processMetaObjects[processDefinitionsId] };

  const blocker = { id: socketId, task: null };
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

/**
 * Removes the id of the socket wanting to unblock the process from the process object
 *
 * @param {String} socketId
 * @param {String} processDefinitionsId
 */
export function unblockProcess(socketId, processDefinitionsId) {
  checkIfProcessExists(processDefinitionsId);

  const process = processMetaObjects[processDefinitionsId];

  if (!process.inEditingBy) {
    return;
  }

  const inEditingBy = process.inEditingBy.filter((blocker) => blocker.id !== socketId);

  updateProcessMetaData(processDefinitionsId, { inEditingBy });
}

export function blockTask(socketId, processDefinitionsId, taskId) {
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

export function unblockTask(socketId, processDefinitionsId, taskId) {
  checkIfProcessExists(processDefinitionsId);

  const process = processMetaObjects[processDefinitionsId];

  if (!process.inEditingBy) {
    return;
  }

  let blocker = process.inEditingBy.find((b) => b.id === socketId);

  if (blocker && blocker.task === taskId) {
    blocker.task = null;

    updateProcessMetaData(processDefinitionsId, { inEditingBy: process.inEditingBy });
  }
}

/**
 * Will remove all instance adaptation processes that are stored
 *
 * @param {Array} processes all stored processes
 * @returns {Array} all stored processes that are not instance adaptation processes
 */
function removeAdaptationProcesses(processes) {
  for (const process of processes) {
    // delete the process data if it is an adaptation process
    if (process.type === 'process-instance') {
      deleteProcess(process.id);
    }
  }

  return processes.filter((p) => p.type !== 'process-instance');
}

/**
 * initializes the process meta information objects
 */
export async function init() {
  // Avoids recreating the processMetaObjects in server actions' module scope if they already exist.
  if (!firstInit) {
    return;
  }

  // get processes that were persistently stored
  const storedProcesses = store.get('processes');
  let updatedProcesses = await getUpdatedProcessesJSON(storedProcesses);

  // remove all adaptation process that might still be stored for some reason
  updatedProcesses = removeAdaptationProcesses(updatedProcesses);

  store.set('processes', 'processes', updatedProcesses);
  const processes = updatedProcesses.map((uP) => ({ ...uP, inEditingBy: [] }));
  processes.forEach((process) => (processMetaObjects[process.id] = process));
}
