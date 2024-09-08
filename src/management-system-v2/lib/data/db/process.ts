import { getFolderById } from './folders';
import eventHandler from '../legacy/eventHandler.js';
import logger from '../legacy/logging.js';

import { getProcessInfo, getDefaultProcessMetaInfo } from '../../helpers/processHelpers';
import { getDefinitionsVersionInformation } from '@proceed/bpmn-helper';
import Ability from '@/lib/ability/abilityHelper';
import {
  Process,
  ProcessMetadata,
  ProcessServerInput,
  ProcessServerInputSchema,
} from '../process-schema';
import { getRootFolder } from './folders';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data';
import { v4 } from 'uuid';
import { ProcessType } from '@prisma/client';
import { UserErrorType, userError } from '@/lib/user-error';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { deleteProcessArtifact } from '../file-manager-facade';

/** Returns all processes for a user */
export async function getProcesses(userId: string, ability: Ability, includeBPMN = false) {
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

export async function getProcess(processDefinitionsId: string, includeBPMN = false) {
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

  // Convert BigInt fields to number
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

/**
 * Throws if process with given id doesn't exist
 *
 * @param {String} processDefinitionsId
 */
export async function checkIfProcessExists(processDefinitionsId: string) {
  const existingProcess = await db.process.findUnique({
    where: {
      id: processDefinitionsId,
    },
  });
  if (!existingProcess) {
    throw new Error(`Process with id ${processDefinitionsId} does not exist!`);
  }
}

/** Handles adding a process, makes sure all necessary information gets parsed from bpmn */
export async function addProcess(processInput: ProcessServerInput & { bpmn: string }) {
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

/** Updates an existing process with the given bpmn */
export async function updateProcess(
  processDefinitionsId: string,
  newInfoInput: Partial<ProcessServerInput> & { bpmn?: string },
) {
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
}

/** Direct updates to process meta data, should mostly be used for internal changes (puppeteer client, electron) to avoid
 * parsing the bpmn unnecessarily */
export async function updateProcessMetaData(
  processDefinitionsId: string,
  metaChanges: Partial<Omit<ProcessMetadata, 'bpmn'>>,
) {
  checkIfProcessExists(processDefinitionsId);
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

/** Removes an existing process */
export async function removeProcess(processDefinitionsId: string) {
  const process = await db.process.findUnique({
    where: { id: processDefinitionsId },
    include: { processArtifacts: true },
  });

  if (!process) {
    return;
  }
  console.log(process);
  await Promise.all(
    process.processArtifacts.map((artifact) =>
      deleteProcessArtifact(processDefinitionsId, artifact.filePath, true),
    ),
  );

  // Remove from database
  await db.process.delete({ where: { id: processDefinitionsId } });

  eventHandler.dispatch('processRemoved', { processDefinitionsId });
}

/** Stores a new version of an existing process */
export async function addProcessVersion(processDefinitionsId: string, bpmn: string) {
  // get the version from the given bpmn

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
        version: versionInformation.version ?? Date.now(),
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
}

/** Returns the bpmn of a specific process version */
export async function getProcessVersionBpmn(processDefinitionsId: string, version: number) {
  let existingProcess = await getProcess(processDefinitionsId);
  if (!existingProcess) {
    throw new Error('The process for which you try to get a version does not exist');
  }

  if (
    !existingProcess.versions ||
    !existingProcess.versions.some((existingVersionInfo) => existingVersionInfo.version == version)
  ) {
    throw new Error('The version you are trying to get does not exist');
  }

  const versn = await db.version.findUnique({
    where: { version: version },
  });
  return versn?.bpmn;
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

// TODO: usertask logic and image handling -> in file manager branch

/** Returns the filenames of the data for all user tasks in the given process */
export async function getProcessUserTasks(processDefinitionsId: string) {
  // TODO
}

/** Returns the form data for a specific user task in a process */
export async function getProcessUserTaskJSON(processDefinitionsId: string, taskFileName: string) {
  // TODO
}

/** Return object mapping from user tasks fileNames to their form data */
export async function getProcessUserTasksJSON(processDefinitionsId: string) {
  return userError('Not Implemented in db', UserErrorType.NotFoundError);
}

export async function saveProcessUserTask(
  processDefinitionsId: string,
  userTaskFileName: string,
  json: string,
) {
  // TODO
}

/** Removes a stored user task from disk */
export async function deleteProcessUserTask(
  processDefinitionsId: string,
  userTaskFileName: string,
) {
  // TODO
}

export async function getProcessImage(processDefinitionsId: string, imageFileName: string) {
  // TODO
}

/** Return Array with fileNames of images for given process */
export async function getProcessImageFileNames(processDefinitionsId: string) {
  // TODO
}

/** Return object mapping from images fileNames to their image */
export async function getProcessImages(processDefinitionsId: string) {
  // TODO
}

export async function saveProcessImage(
  processDefinitionsId: string,
  imageFileName: string,
  image: Buffer,
) {
  // TODO
}

export async function deleteProcessImage(processDefinitionsId: string, imageFileName: string) {
  // TODO
}

/** Stores the id of the socket wanting to block the process from being deleted inside the process object */
export function blockProcess(socketId: string, processDefinitionsId: string) {
  // TODO
}

/** Removes the id of the socket wanting to unblock the process from the process object */
export function unblockProcess(socketId: string, processDefinitionsId: string) {
  // TODO
}

export function blockTask(socketId: string, processDefinitionsId: string, taskId: string) {
  // TODO
}

export function unblockTask(socketId: string, processDefinitionsId: string, taskId: string) {
  // TODO
}

/** Will remove all instance adaptation processes that are stored */
function removeAdaptationProcesses(processes: ProcessMetadata[]) {
  // TODO
}
