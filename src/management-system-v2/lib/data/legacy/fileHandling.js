import envPaths from 'env-paths';
import path from 'path';
import fse from 'fs-extra';
import eventHandler from './eventHandler.js';
import { getProcessInfo as parseProcessInfo } from '../../helpers/processHelpers';
import { asyncForEach, asyncMap } from '../../helpers/javascriptHelpers';

import bpmnHelperEx from '@proceed/bpmn-helper';
const { getDefinitionsVersionInformation } = bpmnHelperEx;

// Exposes functions to find directories and get or store data

/**
 * Returns the path where all the data for the MS is stored
 *
 * should be:
 *
 * Server:
 *  Production: same directory as server files
 *  Development: /path/to/appdata-directory/proceed-management-system-development
 * Electron:
 *  Production: /path/to/appdata-directory/proceed-management-system
 *  Development: /path/to/appdata-directory/proceed-management-system-development
 *
 * @returns {String}
 */
export function getAppDataPath() {
  let appDir;

  if (!process.env.IS_ELECTRON && process.env.NODE_ENV === 'production') {
    // TODO: make this environment variable configurable
    const isPreview = process.env.NEXTAUTH_URL?.startsWith('https://pr-');
    const preview = isPreview
      ? ['previews', process.env.NEXTAUTH_URL.split('---')[0].substring(8)]
      : [];
    appDir = path.join(process.cwd(), 'volume', ...preview);
  } else {
    appDir = envPaths('proceed-management-system').config;
    appDir = appDir.slice(0, appDir.search('-nodejs'));

    if (process.env.NODE_ENV === 'development') {
      appDir = path.join(appDir, 'development');
    }
  }

  return appDir;
}

/**
 * Find the path to the folder where the info about all Processes is stored
 * @returns {String}
 */
function getProcessesFolder() {
  return path.join(getAppDataPath(), 'Processes');
}
/**
 * Find the path to the folder where the info about all Environment Profiles is stored
 * @returns {String}
 */
function getEnvFolder() {
  return path.join(getAppDataPath(), 'EnvProfiles');
}
/**
 * Find the path to the file where the info about an environment profile is stored
 * @returns {String}
 */
function getEnvProfileName(id, type) {
  const envFolder = getEnvFolder();
  const ID = id.substring(0, 8);
  return path.join(envFolder, 'env-'.concat(type.toLowerCase(), '-', ID, '.json'));
}
/**
 * Get the json of an environment profile
 *
 * @returns {String} the environmentProfile json
 */
export async function getEnvProfileJSON(id, type) {
  const filePath = getEnvProfileName(id, type);
  return JSON.parse(fse.readFileSync(filePath));
}
/**
 * Find the path to the folder where the data of a specific process is stored
 *
 * @param id
 * @returns {String}
 */
function getFolder(id) {
  const processesFolder = getProcessesFolder();
  return path.join(processesFolder, id);
}

/**
 * Find the images directory for the given process
 *
 * @param {String} id
 */
function getImagesDir(id) {
  return path.join(getFolder(id), 'images');
}

/**
 * Directory for organization logos
 */
const organizationLogosDir = path.join(getAppDataPath(), 'OrganizationLogos');

/**
 * Find the user task directory for the given process
 *
 * @param {String} id
 */
function getUserTaskDir(id) {
  return path.join(getFolder(id), 'user-tasks');
}

/**
 * Get the bpmn of a specific process as a string
 * @param {String} processDefinitionsId
 * @returns {String} the process description
 */
export function getBPMN(processDefinitionsId) {
  const folder = getFolder(processDefinitionsId);
  const bpmnFilePath = path.join(folder, processDefinitionsId.concat('.bpmn'));
  return fse.readFileSync(bpmnFilePath, 'utf-8');
}

/**
 * Saves the json for a given environment profile
 *
 * @param {String} Id the id of the environment profile
 * @param {String} type the type of the environment profile
 * @param {String} environmentProfile the environment profile json
 */
export async function saveEnvProfile(id, type, environmentProfile) {
  const envFolder = getEnvFolder();

  // creates the directory if it doesn't exist
  fse.ensureDirSync(envFolder);

  const fileName = getEnvProfileName(id, type);

  fse.writeFileSync(fileName, environmentProfile);
}

/**
 * Removes the json file of the environment profile with the given id
 *
 * @param {String} id the id of the environment profile
 * @param {String} type the type of the environment profile
 */
export async function deleteEnvProfile(id, type) {
  const fileToRemove = getEnvProfileName(id, type);
  await fse.unlinkSync(fileToRemove);
}

/**
 * Saves the process bpmn of a process
 *
 * @param {String} id the id of the process
 * @param {String} bpmn the process description
 */
export async function saveProcess(id, bpmn) {
  const currentProcessFolder = getFolder(id);

  fse.ensureDirSync(currentProcessFolder);

  fse.writeFileSync(path.join(currentProcessFolder, id.concat('.bpmn')), bpmn);

  eventHandler.dispatch('files_changed_bpmn', { processDefinitionsId: id, bpmn });
}

function getVersionFileName(definitionId, version) {
  return `${definitionId}-${version}.bpmn`;
}

/**
 * Saves the bpmn of a specific process version
 *
 * @param {String} definitionId
 * @param {number} version the identifier of the version
 * @param {String} bpmn
 */
export async function saveProcessVersion(definitionId, version, bpmn) {
  const currentProcessFolder = getFolder(definitionId);

  fse.writeFileSync(
    path.join(currentProcessFolder, getVersionFileName(definitionId, version)),
    bpmn,
  );
}

/**
 * Will return the bpmn of a specific version of a process
 *
 * @param {String} definitionId
 * @param {number} version
 * @returns {String} the bpmn of the specific process version
 */
export function getProcessVersion(definitionId, version) {
  const folder = getFolder(definitionId);
  const bpmnFilePath = path.join(folder, getVersionFileName(definitionId, version));
  return fse.readFileSync(bpmnFilePath, 'utf-8');
}

/**
 * Deletes the directory for the process we want to remove
 *
 * @param {String} id
 */
export function deleteProcess(id) {
  const processDirectory = getFolder(id);
  fse.removeSync(processDirectory);
}

/**
 * Returns the ids of all user tasks of the process with the given id
 *
 * @param {String} processDefinitionsId
 */
export function getUserTaskIds(processDefinitionsId) {
  return new Promise((resolve, reject) => {
    const userTaskDir = getUserTaskDir(processDefinitionsId);

    if (!fse.existsSync(userTaskDir)) {
      resolve([]);
    }

    fse.readdir(userTaskDir, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const userTaskIds = [];

      if (files) {
        files.forEach(async (file) => {
          const [taskId] = file.split('.');
          userTaskIds.push(taskId);
        });
      }

      resolve(userTaskIds);
    });
  });
}

/**
 * Saves the form data of a user task
 *
 * @param {String} processDefinitionsId the id of the process that contains the user task
 * @param {String} taskId the id of the specific user task
 * @param {String} json the user task form data
 */
export async function saveUserTaskJSON(processDefinitionsId, taskId, json) {
  const userTaskDir = getUserTaskDir(processDefinitionsId);
  fse.ensureDirSync(userTaskDir);
  fse.writeFileSync(path.join(userTaskDir, `${taskId}.json`), json);
}

/**
 * Returns the image with the given filename in a process
 *
 * @param {String} processDefinitionsId
 * @param {String} imageFileName
 */
export async function getImage(processDefinitionsId, imageFileName) {
  const imagesDir = getImagesDir(processDefinitionsId);
  const imagePath = path.join(imagesDir, imageFileName);
  const image = fse.readFileSync(imagePath);
  return image;
}

/**
 * Returns all image filenames in a process
 *
 * @param {String} processDefinitionsId
 *
 * @returns {Promise<string[]>}
 *    @resolves {Array} Array containing all fileNames for images
 */
export function getImageFileNames(processDefinitionsId) {
  return new Promise((resolve, reject) => {
    const imagesDir = getImagesDir(processDefinitionsId);

    if (!fse.existsSync(imagesDir)) {
      resolve([]);
    }

    fse.readdir(imagesDir, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(files);
    });
  });
}

/**
 * Returns all images in a process
 *
 * @param {String} processDefinitionsId
 *
 * @returns {Promise}
 *    @resolves {Object} Object containing a fileName to image mapping
 */
export function getImages(processDefinitionsId) {
  return new Promise((resolve, reject) => {
    const imagesDir = getImagesDir(processDefinitionsId);

    if (!fse.existsSync(imagesDir)) {
      resolve({});
    }

    fse.readdir(imagesDir, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const images = {};

      if (files) {
        files.forEach(async (file) => {
          const imageFilePath = path.join(imagesDir, file);
          const imageFileContent = fse.readFileSync(imageFilePath);

          images[file] = imageFileContent;
        });
      }

      resolve(images);
    });
  });
}

/**
 * Saves an image used in a process
 *
 * @param {String} processDefinitionsId the id of the process that contains the image
 * @param {String} imageId the id of the specific image
 * @param {Buffer} image an image
 */
export async function saveImage(processDefinitionsId, imageFileName, image) {
  const imagesDir = getImagesDir(processDefinitionsId);

  fse.ensureDirSync(imagesDir);

  fse.writeFileSync(path.join(imagesDir, `${imageFileName}`), image);

  eventHandler.dispatch('image_changed', { processDefinitionsId, imageFileName, image });
}

/**
 * Deletes an image used in a process
 *
 * @param {String} processDefinitionsId the id of the process that contains the image
 * @param {String} imageId the id of the specific image
 */
export async function deleteImage(processDefinitionsId, imageFileName) {
  const imagesDir = getImagesDir(processDefinitionsId);
  const filePath = path.join(imagesDir, `${imageFileName}`);
  fse.unlinkSync(filePath);
}

/**
 * Returns the form data for a user task with the given id in a process
 *
 * @param {String} processDefinitionsId
 * @param {String} taskId
 */
export function getUserTaskJSON(processDefinitionsId, taskId) {
  const userTaskDir = getUserTaskDir(processDefinitionsId);
  const userTaskFile = `${taskId}.json`;
  const userTaskPath = path.join(userTaskDir, userTaskFile);
  return fse.readFileSync(userTaskPath, 'utf-8');
}

/**
 * Returns the form data for all user tasks in a process
 *
 * @param {String} processDefinitionsId
 *
 * @returns {Promise}
 *    @resolves {Object} Object containing a taskId to form data mapping
 */
export function getUserTasksJSON(processDefinitionsId) {
  return new Promise((resolve, reject) => {
    const userTaskDir = getUserTaskDir(processDefinitionsId);

    if (!fse.existsSync(userTaskDir)) {
      resolve({});
    }

    fse.readdir(userTaskDir, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const userTasksJSON = {};

      if (files) {
        files.forEach(async (file) => {
          const filePath = path.join(userTaskDir, file);
          const fileContents = fse.readFileSync(filePath, 'utf-8');
          const [taskId] = file.split('.');

          userTasksJSON[taskId] = fileContents;
        });
      }

      resolve(userTasksJSON);
    });
  });
}

export async function deleteUserTaskJSON(processDefinitionsId, taskId) {
  const userTaskDir = getUserTaskDir(processDefinitionsId);
  const taskFile = `${taskId}.json`;
  const filePath = path.join(userTaskDir, taskFile);

  fse.unlinkSync(filePath);
}

/**
 * Saves the script for a scriptTask
 *
 * @param {String} processDefinitionsId
 * @param {String} taskId
 * @param {String} js
 */
export async function saveScriptTaskJS(processDefinitionsId, taskId, js) {
  const currentProcessFolder = getFolder(processDefinitionsId);
  const folder = path.join(currentProcessFolder, 'Script-Tasks');

  fse.ensureDirSync(folder);

  fse.writeFileSync(path.join(folder, `${taskId}.js`), js);
}

/**
 * Saves new process bpmn for an existing process and changes the file and directory name if the process name changed
 *
 * @param {String} id
 * @param {String} bpmn
 * @param {String} newName optional
 */
export async function updateProcess(id, bpmn) {
  // Save new bpmn into existing bpmn file
  const currentProcessFolderPath = getFolder(id);
  const currentBpmnFile = path.join(currentProcessFolderPath, id.concat('.bpmn'));
  fse.writeFileSync(currentBpmnFile, bpmn);

  eventHandler.dispatch('files_changed_bpmn', { processDefinitionsId: id, bpmn });
}

/**
 * Will execute the given callback for every entry of a directory under the given path
 *
 * @param {String} directoryPath the path to the directory to iterate
 * @param {Function} cb the function to execute for every entry inside the directory
 */
async function iterateDirectoryContent(directoryPath, cb) {
  // get directory entries
  let dirEntries;
  try {
    dirEntries = await fse.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    //logger is not yet possible to include here
    console.error('Error during the attempt to read the directory: \n' + error);
    throw new Error('Failed to read directory');
  }

  // execute the callback for each entry
  await asyncForEach(dirEntries, cb);
}

/**
 * Returns the contents of the processes in the processes directory
 * (will skip the ones were no valid bpmn was found)
 *
 * @returns {String[]} the bpmn for every process found in the processes directory
 */
export async function getAllProcessesBpmn() {
  let bpmnFiles = {};

  const processesFolder = getProcessesFolder();
  // create the processes directory if it doesn't exist yet
  fse.ensureDirSync(processesFolder);

  // get the bpmn of every valid process directory
  await iterateDirectoryContent(processesFolder, async (dirEntry) => {
    if (dirEntry.isDirectory()) {
      const bpmnFilePath = path.join(processesFolder, dirEntry.name, `${dirEntry.name}.bpmn`);
      try {
        const bpmnFileContents = await fse.readFile(bpmnFilePath, 'utf-8');
        bpmnFiles[dirEntry.name] = bpmnFileContents;
      } catch (error) {
        //logger is not yet possible to include here
        console.info(
          'A BPMN process file does not exists in a process folder. Process is skipped.\n' + error,
        );
      }
    }
  });

  return bpmnFiles;
}

/**
 * Will create a process meta object for every process in the processes directory
 *
 * process meta-data that is passed into this function is used for the creation of the meta object
 *
 * @param {Object[]} processes an array containing known meta information about processes
 * @returns {Object[]} an array containing the meta information for all processes in the processes directory
 */
export async function getUpdatedProcessesJSON(processes) {
  const processesMapping = await getAllProcessesBpmn();

  return await asyncMap(Object.keys(processesMapping), async (definitionId) => {
    // check for previously known information about the process
    const existingProcess = processes.find((p) => p.id === definitionId);
    // merge the information with the one in the bpmn
    const newProcess = await getProcessInfo(processesMapping[definitionId], existingProcess || {});

    // get all existing versions of the process
    const processDirectory = getFolder(definitionId);
    const versionFileRegex = new RegExp(`${definitionId}-([0-9]+)\.bpmn`, 'g');
    await iterateDirectoryContent(processDirectory, async (dirEntry) => {
      if (dirEntry.isFile() && dirEntry.name.match(versionFileRegex)) {
        const filePath = path.join(processDirectory, dirEntry.name);
        const bpmn = await fse.readFile(filePath, 'utf-8');
        const versionInformation = await getDefinitionsVersionInformation(bpmn);
        newProcess.versions.push(versionInformation);
      }
    });
    // sort the versions (by their creation date)
    newProcess.versions.sort((a, b) => b.version - a.version);

    return newProcess;
  });
}

/**
 * Combines the information from the bpmn of a process with already known meta information
 *
 * @param {String} bpmn
 * @param {Object} process the meta information about the process
 * @returns {Object} the complete meta information
 */
async function getProcessInfo(bpmn, process) {
  const { id, originalId, name, processIds, description } = await parseProcessInfo(bpmn);

  const currentDate = new Date().toUTCString();

  let newProcess = {
    id,
    originalId,
    name,
    description,
    departments: process.departments || [],
    variables: process.variables || [],
    createdOn: process.createdOn || currentDate,
    lastEdited: process.lastEdited || currentDate,
    type: process.type || (process.isProject ? 'project' : 'process'),
    processIds,
    versions: [],
    owner: process.owner,
    environmentId: process.environmentId,
    folderId: process.folderId,
    sharedAs: process.sharedAs,
    shareTimestamp: process.shareTimestamp,
    allowIframeTimestamp: process.allowIframeTimestamp,
  };

  if (newProcess.type === 'project') {
    newProcess = {
      ...newProcess,
      scheduleStatus: process.scheduleStatus || '',
      planningStatus: process.planningStatus || '',
      plannedEndDate: process.plannedEndDate || '',
    };
  }
  return newProcess;
}

/**
 * Saves a logo for an organization
 *
 * @param {String} organizationId the id of the organization
 * @param {Buffer} image an image
 */
export function saveLogo(organizationId, image) {
  fse.ensureDirSync(organizationLogosDir);

  fse.writeFileSync(path.join(organizationLogosDir, `${organizationId}`), image);
}

/**
 * Returns the logo for an organization
 *
 * @param {String} organizationId the id of the organization
 */
export function hasLogo(organizationId) {
  const imagePath = path.join(organizationLogosDir, `${organizationId}`);
  return fse.existsSync(imagePath);
}

/**
 * Returns the logo for an organization
 *
 * @param {String} organizationId the id of the organization
 */
export function getLogo(organizationId) {
  const imagePath = path.join(organizationLogosDir, `${organizationId}`);
  return fse.readFileSync(imagePath);
}

/**
 * Deletes organizations logo
 *
 * @param {String} organizationId the id of the organization
 */
export function deleteLogo(organizationId) {
  const imagePath = path.join(organizationLogosDir, `${organizationId}`);
  fse.removeSync(imagePath);
}
