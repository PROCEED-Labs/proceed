import { getFolderById, init as initFolders } from './folders';
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

import bpmnHelperEx from '@proceed/bpmn-helper';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { ProcessMetadata, ProcessServerInput, ProcessServerInputSchema } from '../process-schema';
import { foldersMetaObject, getRootFolder } from './folders';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { enableUseDB } from 'FeatureFlags';
import db from '@/lib/data';
import { antDesignInputProps } from '@/lib/useParseZodErrors';
import { v4 } from 'uuid';
import { ProcessType } from '@prisma/client';

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
export async function getProcesses(userId: string, ability: Ability, includeBPMN = false) {
  if (enableUseDB) {
    const userProcesses = await db.process.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        originalId: true,
        name: true,
        description: true,
        createdOn: true,
        lastEditedOn: true,
        inEditingBy: true,
        processIds: true,
        type: true,
        folderId: true,
        sharedAs: true,
        shareTimestamp: true,
        allowIframeTimestamp: true,
        environmentId: true,
        ownerId: true,
        departments: true,
        variables: true,
        versions: true,
        bpmn: includeBPMN,
      },
    });

    //TODO: ability check ? is it really necessary in this case?
    //TODO: add pagination

    return userProcesses;
  }

  const processes = Object.values(processMetaObjects);

  const userProcesses = await Promise.all(
    ability
      .filter('view', 'Process', processes)
      .map(async (process) =>
        !includeBPMN ? process : { ...process, bpmn: getProcessBpmn(process.id) },
      ),
  );

  return userProcesses;
}

export async function getProcess(processDefinitionsId: string, includeBPMN = false) {
  if (enableUseDB) {
    const process = await db.process.findUnique({
      where: {
        id: processDefinitionsId,
      },
      select: {
        id: true,
        originalId: true,
        name: true,
        description: true,
        createdOn: true,
        lastEditedOn: true,
        inEditingBy: true,
        processIds: true,
        type: true,
        folderId: true,
        sharedAs: true,
        shareTimestamp: true,
        allowIframeTimestamp: true,
        environmentId: true,
        ownerId: true,
        departments: true,
        variables: true,
        versions: true,
        bpmn: includeBPMN,
      },
    });
    if (!process) {
      throw new Error(`Process with id ${processDefinitionsId} could not be found!`);
    }
    // Convert BigInt fields in versions to number
    const convertedVersions = process.versions.map((version) => ({
      ...version,
      version: typeof version.version === 'bigint' ? Number(version.version) : version.version,
      versionBasedOn:
        typeof version.versionBasedOn === 'bigint'
          ? Number(version.versionBasedOn)
          : version.versionBasedOn,
    }));

    const convertedProcess = {
      ...process,
      type: process.type.toLowerCase(),
      versions: convertedVersions,
      shareTimestamp:
        typeof process.shareTimestamp === 'bigint'
          ? Number(process.shareTimestamp)
          : process.shareTimestamp,
      allowIframeTimestamp:
        typeof process.allowIframeTimestamp === 'bigint'
          ? Number(process.allowIframeTimestamp)
          : process.allowIframeTimestamp,
    };

    return convertedProcess;
  }
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
export async function checkIfProcessExists(processDefinitionsId: string) {
  if (enableUseDB) {
    const existingProcess = await db.process.findUnique({
      where: {
        id: processDefinitionsId,
      },
    });
    if (!existingProcess) {
      throw new Error(`Process with id ${processDefinitionsId} does not exist!`);
    }
  } else {
    if (!processMetaObjects[processDefinitionsId]) {
      throw new Error(`Process with id ${processDefinitionsId} does not exist!`);
    }
  }
}

/** Handles adding a process, makes sure all necessary information gets parsed from bpmn */
export async function addProcess(processInput: ProcessServerInput & { bpmn: string }) {
  if (enableUseDB) {
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

    const folderData = await getFolderById(metadata.folderId);
    if (!folderData) throw new Error('Folder not found');
    // TODO check folder permissions here, they're checked in movefolder,
    // but by then the folder was already created

    const { id: processDefinitionsId } = metadata;

    // check if there is an id collision
    const existingProcess = await db.process.findUnique({
      where: {
        id: processDefinitionsId,
      },
    });
    if (existingProcess) {
      throw new Error(`Process with id ${processDefinitionsId} already exists!`);
    }

    const processTypeEnum: ProcessType = {
      process: 'Process',
      project: 'Project',
      template: 'Template',
    }[metadata.type.toLowerCase()] as ProcessType;

    // save process info
    try {
      await db.process.create({
        data: {
          id: metadata.id,
          originalId: metadata.originalId ?? '',
          name: metadata.name,
          description: metadata.description,
          createdOn: new Date().toISOString(),
          lastEditedOn: new Date().toISOString(),
          type: processTypeEnum,
          processIds: { set: metadata.processIds },
          folderId: metadata.folderId,
          sharedAs: metadata.sharedAs,
          shareTimestamp: metadata.shareTimestamp,
          allowIframeTimestamp: metadata.allowIframeTimestamp,
          environmentId: metadata.environmentId,
          ownerId: metadata.ownerId,
          departments: { set: metadata.departments },
          variables: { set: metadata.variables },
          bpmn: bpmn,
        },
      });
    } catch (error) {
      console.error('Error adding new process: ', error);
    }

    moveProcess({
      processDefinitionsId,
      newFolderId: metadata.folderId,
      dontUpdateOldFolder: true,
    });

    eventHandler.dispatch('processAdded', { process: metadata });

    return metadata;
  }

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
  if (enableUseDB) {
    const { bpmn: newBpmn } = newInfoInput;
    const newInfo = ProcessServerInputSchema.partial().parse(newInfoInput);
    checkIfProcessExists(processDefinitionsId);
    const currentParent = (await getProcess(processDefinitionsId)).folderId;

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
      //delete metaChanges.folderId;
    }

    const newMetaData = await updateProcessMetaData(processDefinitionsId, metaChanges);

    if (newBpmn) {
      try {
        await db.process.update({
          where: { id: processDefinitionsId },
          data: { bpmn: newBpmn, lastEditedOn: new Date().toISOString() },
        });
      } catch (error) {
        console.error('Error updating bpmn: ', error);
      }
      eventHandler.dispatch('backend_processXmlChanged', {
        definitionsId: processDefinitionsId,
        newXml: newBpmn,
      });
    }

    return newMetaData;
  }

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

export async function moveProcess({
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
  if (enableUseDB) {
    console.log('move process');
    try {
      const process = await getProcess(processDefinitionsId);
      if (!process) {
        throw new Error('Process not found');
      }

      const oldFolderId = process.folderId;
      const [oldFolder, newFolder] = await Promise.all([
        db.folder.findUnique({
          where: { id: oldFolderId! },
          include: { childrenFolder: true },
        }),
        db.folder.findUnique({
          where: { id: newFolderId },
          include: { childrenFolder: true },
        }),
      ]);

      if (!oldFolder) {
        throw new Error("Consistency Error: Process' old folder not found");
      }
      if (!newFolder) {
        throw new Error('New folder not found');
      }

      // Permission checks
      if (
        ability &&
        !(
          ability.can('update', toCaslResource('Process', process)) &&
          ability.can('update', toCaslResource('Folder', oldFolder)) &&
          ability.can('update', toCaslResource('Folder', newFolder))
        )
      ) {
        throw new Error('Unauthorized');
      }

      // Remove process from old folder's children

      /*if (!dontUpdateOldFolder) {
        const updatedOldFolder = await db.folder.update({
          where: { id: oldFolderId! },
          data: {
            processes: {
              disconnect: [{ id: process.id }],
            },
            lastEditedOn: new Date().toISOString(),
          },
          include: { childrenFolder: true },
        });
      }

      // Add process to new folder's children
      const updatedNewFolder = await db.folder.update({
        where: { id: newFolderId },
        data: {
          processes: {
            connect: [{ id: process.id }],
          },
          lastEditedOn: new Date().toISOString(),
        },
        include: { childrenFolder: true },
      });*/

      // Update process' folderId in the database
      const updatedProcess = await db.process.update({
        where: { id: processDefinitionsId },
        data: {
          folderId: newFolderId,
        },
      });

      return updatedProcess;
    } catch (error) {
      console.error('Error moving process:', error);
    }
  } else {
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
      if (!oldFolder) throw new Error("Consistensy Error: Process' folder not found");
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
}

/** Direct updates to process meta data, should mostly be used for internal changes (puppeteer client, electron) to avoid
 * parsing the bpmn unnecessarily */
export async function updateProcessMetaData(
  processDefinitionsId: string,
  metaChanges: Partial<Omit<ProcessMetadata, 'bpmn'>>,
) {
  checkIfProcessExists(processDefinitionsId);
  if (enableUseDB) {
    try {
      const updatedProcess = await db.process.update({
        where: { id: processDefinitionsId },
        data: {
          ...(metaChanges as any),
          lastEditedOn: new Date().toISOString(),
        },
      });

      eventHandler.dispatch('processUpdated', {
        oldId: processDefinitionsId,
        updatedInfo: updatedProcess,
      });

      return updatedProcess;
    } catch (error) {
      console.error('Error updating process metadata:', error);
    }
  }
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
  if (enableUseDB) {
    const process = await db.process.findUnique({
      where: { id: processDefinitionsId },
      include: { folder: true },
    });

    if (!process) {
      return;
    }

    // Remove from database
    await db.process.delete({ where: { id: processDefinitionsId } });

    eventHandler.dispatch('processRemoved', { processDefinitionsId });
  }

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
  if (enableUseDB) {
    let versionInformation = await getDefinitionsVersionInformation(bpmn);
    if (!versionInformation) {
      throw new Error('The given bpmn does not contain a version.');
    }

    const existingProcess = await getProcess(processDefinitionsId);
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
    const id = v4();
    // save the new version in the directory of the process
    try {
      await db.version.create({
        data: {
          id,
          name: versionInformation.name ?? '',
          version: versionInformation.version || Date.now(),
          description: versionInformation.description ?? '',
          versionBasedOn: versionInformation.versionBasedOn,
          process: { connect: { id: processDefinitionsId } },
          bpmn: bpmn,
          createdOn: new Date(),
          lastEditedOn: new Date(),
        },
      });
    } catch (error) {
      console.error('Error creating version: ', error);
      throw new Error('Error creating the version');
    }

    // add information about the new version to the meta information and inform others about its existance
    const newVersions = existingProcess.versions ? [...existingProcess.versions] : [];

    //@ts-ignore
    newVersions.push(versionInformation);
    newVersions.sort((a, b) => (b.version > a.version ? 1 : -1));
  } else {
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

    await saveProcessVersion(processDefinitionsId, versionInformation.version || 0, bpmn);

    // add information about the new version to the meta information and inform others about its existance
    const newVersions = existingProcess.versions ? [...existingProcess.versions] : [];

    //@ts-ignore
    newVersions.push(versionInformation);
    newVersions.sort((a, b) => b.version - a.version);

    await updateProcessMetaData(processDefinitionsId, { versions: newVersions });
  }
}

/** Returns the bpmn of a specific process version */
export async function getProcessVersionBpmn(processDefinitionsId: string, version: number) {
  if (enableUseDB) {
    let existingProcess = await getProcess(processDefinitionsId);
    if (!existingProcess) {
      throw new Error('The process for which you try to get a version does not exist');
    }

    if (
      !existingProcess.versions ||
      !existingProcess.versions.some(
        (existingVersionInfo) => existingVersionInfo.version == version,
      )
    ) {
      throw new Error('The version you are trying to get does not exist');
    }

    const versn = await db.version.findUnique({
      where: { version: version },
    });
    return versn?.bpmn;
  }

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

  return getProcessVersion(processDefinitionsId, version);
}

/** Removes information from the meta data that would not be correct after a restart */
function removeExcessiveInformation(processInfo: Omit<ProcessMetadata, 'bpmn'>) {
  const newInfo = { ...processInfo };
  delete newInfo.inEditingBy;
  return newInfo;
}

/** Returns the process definition for the process with the given id */
export async function getProcessBpmn(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  if (enableUseDB) {
    try {
      const process = await db.process.findUnique({
        where: {
          id: processDefinitionsId,
        },
        select: {
          bpmn: true,
        },
      });
      return process?.bpmn;
    } catch (err) {
      logger.debug(`Error reading bpmn of process. Reason:\n${err}`);
      throw new Error('Unable to find process bpmn!');
    }
  }

  try {
    const bpmn = getBPMN(processDefinitionsId);
    return bpmn;
  } catch (err) {
    logger.debug(`Error reading bpmn of process. Reason:\n${err}`);
    throw new Error('Unable to find process bpmn!');
  }
}

/** Returns the filenames of html data for all user tasks in the given process */
export async function getProcessUserTasks(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const userTaskIds = await getUserTaskIds(processDefinitionsId);
    return userTaskIds;
  } catch (err) {
    logger.debug(`Error reading user task ids. Reason:\n${err}`);
    throw new Error('Unable to read user task filenames');
  }
}

/** Returns the html for a specific user task in a process */
export async function getProcessUserTaskHtml(processDefinitionsId: string, taskFileName: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const userTaskHtml = await getUserTaskHTML(processDefinitionsId, taskFileName);
    return userTaskHtml;
  } catch (err) {
    logger.debug(`Error getting html of user task. Reason:\n${err}`);
    throw new Error('Unable to get html for user task!');
  }
}

/** Return object mapping from user tasks fileNames to their html */
export async function getProcessUserTasksHtml(processDefinitionsId: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const userTasksHtml = await getUserTasksHTML(processDefinitionsId);
    return userTasksHtml;
  } catch (err) {
    logger.debug(`Error getting user task html. Reason:\n${err}`);
    throw new Error('Failed getting html for all user tasks');
  }
}

export async function saveProcessUserTask(
  processDefinitionsId: string,
  userTaskFileName: string,
  html: string,
) {
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

/** Removes a stored user task from disk */
export async function deleteProcessUserTask(
  processDefinitionsId: string,
  userTaskFileName: string,
) {
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

/**
 * initializes the process meta information objects
 */
export async function init() {
  // Avoids recreating the processMetaObjects in server actions' module scope if they already exist.
  if (!firstInit) {
    return;
  }

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
