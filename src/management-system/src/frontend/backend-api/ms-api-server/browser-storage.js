import { getProcessInfo } from '@/shared-frontend-backend/helpers/processHelpers.js';
import { mergeIntoObject } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';
import {
  setDefinitionsName,
  addDocumentation,
  getDefinitionsVersionInformation,
  setDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';

let processes = undefined;

/**
 * Returns all processes that are stored in the browser
 *
 * @returns {Object} an object containing all locally stored processes
 */
export function getProcesses() {
  if (!processes) {
    let storedProcesses = localStorage.processes;

    if (!storedProcesses) {
      processes = {};
    } else {
      try {
        processes = JSON.parse(storedProcesses);
      } catch (err) {
        processes = {};
      }
    }
  }

  return processes;
}

export function updateProcesses(updated) {
  processes = updated;
  localStorage.processes = JSON.stringify(updated);
}

export function updateProcess(definitionsId, updated) {
  let updatedProcesses = { ...getProcesses() };

  if (updated) {
    updatedProcesses[definitionsId] = updated;
  } else {
    delete updatedProcesses[definitionsId];
  }

  updateProcesses(updatedProcesses);
}

/**
 * Returns if a process with the given id is stored in the browser
 *
 * @param {String} processDefinitionsId
 * @returns {Boolean}
 */
export function hasProcess(processDefinitionsId) {
  return !!getProcesses()[processDefinitionsId];
}

export function isProcessLocal(processDefinitionsId) {
  if (!hasProcess(processDefinitionsId) || getProcess(processDefinitionsId).processData.shared) {
    return false;
  }

  return true;
}

/**
 * Returns the locally stored process with the given id
 *
 * @param {String} processDefinitionsId
 * @param {Object} [processes] the list of objects to search (to avoid redundant parsing)
 * @returns {Object} an Object containing the processes information
 */
export function getProcess(processDefinitionsId, processes = getProcesses()) {
  if (!processes[processDefinitionsId]) {
    throw new Error('There is no local process with the given id!');
  }

  return JSON.parse(JSON.stringify(processes[processDefinitionsId]));
}

/**
 * Adds a new process to the browsers localStorage
 *
 * @param {String} processData the process definition and additional process info
 */
export async function addProcess(initData) {
  const { bpmn } = initData;
  const date = new Date().toUTCString();
  // create meta info object
  const processData = {
    createdOn: date,
    lastEdited: date,
    inEditingBy: [],
    departments: [],
    variables: [],
    versions: [],
    bpmn,
    ...initData,
    ...(await getProcessInfo(bpmn)),
  };

  updateProcess(processData.id, { processData, html: {}, js: {}, versions: {}, images: {} });

  return processData;
}

/**
 * Removes a process from the localStorage
 *
 * @param {String} processDefinitionsId
 */
export function removeProcess(processDefinitionsId) {
  updateProcess(processDefinitionsId, undefined);
}

/**
 * Will save the bpmn for all versions of a process
 *
 * @param {string} processDefinitionsId
 * @param {(string|number)} versions
 */
export function saveVersions(processDefinitionsId, versions) {
  const process = getProcess(processDefinitionsId);

  process.versions = versions;

  updateProcess(processDefinitionsId, process);
}

/**
 * Will store a new version of an existing process
 *
 * @param {String} processDefinitionsId
 * @param {String} bpmn
 */
export async function addProcessVersion(processDefinitionsId, bpmn) {
  let versionInformation = await getDefinitionsVersionInformation(bpmn);

  if (!versionInformation) {
    throw new Error('The given bpmn does not contain a version!');
  }

  let process = getProcess(processDefinitionsId);
  if (!process) {
    throw new Error('The process for which you are trying to add a version does not exist!');
  }

  // save the bpmn of the new version
  process = { ...process, versions: { ...process.versions, [versionInformation.version]: bpmn } };
  updateProcess(processDefinitionsId, process);

  // add information about the new version to the meta information
  const versions = process.processData.versions;
  const newVersions = versions ? [...versions] : [];
  newVersions.push(versionInformation);
  newVersions.sort((a, b) => b.version - a.version);
  await updateProcessMetaData(processDefinitionsId, { versions: newVersions });
}

/**
 * Returns the bpmn of a specific version of a process
 *
 * @param {String} processDefinitionsId
 * @param {String|Number} version
 * @returns {String} the bpmn of the process version
 */
export async function getProcessVersionBpmn(processDefinitionsId, version) {
  const process = getProcess(processDefinitionsId);

  if (!process) {
    throw new Error(`Process with with id ${processDefinitionsId} does not exist`);
  }

  return process.versions[version];
}

/**
 * Updates the process definition of a process in the local storage
 *
 * @param {String} processDefinitionsId
 * @param {String} bpmn the new process definition
 */
export function updateBPMN(processDefinitionsId, bpmn) {
  const process = getProcess(processDefinitionsId);
  process.processData.bpmn = bpmn;
  updateProcess(processDefinitionsId, process);
}

/**
 * Updates the meta data about a process in the local storage
 *
 * @param {String} processDefinitionsId
 * @param {String} metaChanges contains the entries to change
 */
export function updateProcessMetaData(processDefinitionsId, metaChanges) {
  const process = getProcess(processDefinitionsId);
  const processData = { ...process.processData, lastEdited: new Date().toUTCString() };
  mergeIntoObject(processData, metaChanges, true, true, true);
  process.processData = processData;

  updateProcess(processDefinitionsId, process);

  let updatedProcess = { ...processData, bpmn: undefined };

  // process-instance processes and dummy-processes are only used to provide a collaborative instance editing and migration through the backend
  // there is no point in keeping them in storage when they have been removed from the backend
  if (
    (updatedProcess.type === 'process-instance' || updatedProcess.type === 'dummy-process') &&
    !updatedProcess.shared
  ) {
    removeProcess(processDefinitionsId);
    updatedProcess = undefined;
  }

  return updatedProcess;
}

/**
 * Changes the name of a process in its definition and meta data
 *
 * @param {String} processDefinitionsId
 * @param {String} newName
 */
export async function updateProcessName(processDefinitionsId, newName) {
  const process = getProcess(processDefinitionsId);

  let { bpmn } = process.processData;
  bpmn = await setDefinitionsName(bpmn, newName);

  process.processData.bpmn = bpmn;
  process.processData.name = newName;

  updateProcess(processDefinitionsId, process);
}

/**
 * Changes the based on version of a process in its definition
 *
 * @param {String} processDefinitionsId
 * @param {String} versionBasedOn
 */
export async function updateProcessVersionBasedOn(processDefinitionsId, versionBasedOn) {
  const process = getProcess(processDefinitionsId);

  let { bpmn } = process.processData;

  const versionInformation = await getDefinitionsVersionInformation(bpmn);

  bpmn = await setDefinitionsVersionInformation(bpmn, { ...versionInformation, versionBasedOn });

  process.processData.bpmn = bpmn;

  updateProcess(processDefinitionsId, process);
}

/**
 * Updates a processes description in its definition and meta data
 *
 * @param {String} processDefinitionsId
 * @param {String} description
 */
export async function updateProcessDescription(processDefinitionsId, description) {
  const process = getProcess(processDefinitionsId);

  let { bpmn } = process.processData;
  bpmn = await addDocumentation(bpmn, description);

  process.processData.bpmn = bpmn;
  process.processData.description = description;

  updateProcess(processDefinitionsId, process);
}

/**
 * Returns the user task data for all user tasks in a process
 *
 * @param {String} processDefinitionsId
 * @returns {Object} contains mapping from user task filename to user task data
 */
export async function getUserTasksHTML(processDefinitionsId) {
  return getProcess(processDefinitionsId).html;
}

/**
 * Overwrites user tasks of a process with the given ones
 *
 * @param {String} definitionsId
 * @param {Object} userTasks mapping from filenames to the contained html
 */
export function saveUserTasksHtml(definitionsId, userTasks) {
  const process = getProcess(definitionsId);

  process.html = userTasks;

  updateProcess(definitionsId, process);
}

/**
 * Saves user task data for a specific process
 *
 * @param {String} definitionsId
 * @param {String} taskFileName the tasks filename that would be used if it was stored on the server
 * @param {String} html the user task data
 */
export async function saveUserTaskHTML(definitionsId, taskFileName, html) {
  const process = getProcess(definitionsId);

  process.html[taskFileName] = html;

  updateProcess(definitionsId, process);
}

/**
 * Removes data for a specific user task
 *
 * @param {String} processDefinitionsId
 * @param {String} taskFileName
 */
export async function deleteUserTaskHTML(processDefinitionsId, taskFileName) {
  const process = getProcess(processDefinitionsId);

  delete process.html[taskFileName];

  updateProcess(processDefinitionsId, process);
}

/**
 * Returns image in a process
 *
 * @param {String} processDefinitionsId
 * @param {String} imageFileName the images filename that would be used if it was stored on the server
 * @returns {Object} retrieved image from process
 */
export async function getImage(processDefinitionsId, imageFileName) {
  const process = getProcess(processDefinitionsId);
  return process.images[imageFileName];
}

/**
 * Saves image a specific process
 *
 * @param {String} definitionsId
 * @param {String} imageFileName the images filename that would be used if it was stored on the server
 * @param {String} image the image used
 */
export async function saveImage(definitionsId, imageFileName, image) {
  const process = getProcess(definitionsId);

  const reader = new FileReader();
  reader.readAsDataURL(image);
  return new Promise((resolve) => {
    reader.addEventListener('load', () => {
      process.images[imageFileName] = reader.result;
      updateProcess(definitionsId, process);
      resolve();
    });
  });
}

/**
 * Deleted image a specific process
 *
 * @param {String} definitionsId
 * @param {String} imageFileName the images filename that would be used if it was stored on the server
 */
export async function deleteImage(definitionsId, imageFileName) {
  const process = getProcess(definitionsId);

  delete process.images[imageFileName];

  updateProcess(definitionsId, process);
}

/**
 * Saves script task data for a specific task inside a process
 *
 * @param {String} processDefinitionsId
 * @param {String} taskId
 * @param {String} js
 */
export function saveScriptTaskJS(processDefinitionsId, taskId, js) {
  const process = getProcess(processDefinitionsId);

  process.js[taskId] = js;

  updateProcess(processDefinitionsId, process);
}
