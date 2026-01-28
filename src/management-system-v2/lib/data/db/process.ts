import { ok, err, Result } from 'neverthrow';
import { getFolderById } from './folders';
import eventHandler from '../legacy/eventHandler.js';
import logger from '../legacy/logging.js';
import {
  getProcessInfo,
  getDefaultProcessMetaInfo,
  BpmnAttributeType,
  transformBpmnAttributes,
} from '../../helpers/processHelpers';
import {
  getDefinitionsVersionInformation,
  generateBpmnId,
  getScriptTaskFileNameMapping,
} from '@proceed/bpmn-helper';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { ProcessMetadata, ProcessServerInput, ProcessServerInputSchema } from '../process-schema';
import { getRootFolder } from './folders';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';

import {
  deleteProcessArtifact,
  getArtifactMetaData,
  saveProcessArtifact,
  updateFileDeletableStatus,
} from '../file-manager-facade';
import { toCustomUTCString } from '@/lib/helpers/timeHelper';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { copyFile, retrieveFile } from '../file-manager/file-manager';
import { generateProcessFilePath } from '@/lib/helpers/fileManagerHelpers';
import { Prisma } from '@prisma/client';
import { getUsedImagesFromJson } from '@/components/html-form-editor/serialized-format-utils';
import { ensureTransactionWrapper } from './util';

/**
 * Returns all processes in an environment
 * If you want the processes for a specific user, you have to provide his ability
 * */
export async function getProcesses(environmentId: string, ability?: Ability, includeBPMN = false) {
  const spaceProcesses = await db.process.findMany({
    where: {
      environmentId,
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
      executable: true,
      environmentId: true,
      creatorId: true,
      //departments: true,
      //variables: true,
      versions: true,
      bpmn: includeBPMN,
    },
  });

  //TODO: add pagination

  return ok(ability ? ability.filter('view', 'Process', spaceProcesses) : spaceProcesses);
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
      userDefinedId: true,
      type: true,
      folderId: true,
      sharedAs: true,
      shareTimestamp: true,
      allowIframeTimestamp: true,
      executable: true,
      environmentId: true,
      creatorId: true,
      //departments: true,
      //variables: true,
      versions: true,
    },
  });
  if (!process) {
    return err(new Error(`Process with id ${processDefinitionsId} could not be found!`));
  }

  // Convert BigInt fields to number
  // const convertedVersions = process.versions.map((version) => ({
  //   ...version,
  //   version: typeof version.version === 'bigint' ? Number(version.version) : version.version,
  //   versionBasedOn:
  //     typeof version.versionBasedOn === 'bigint'
  //       ? Number(version.versionBasedOn)
  //       : version.versionBasedOn,
  // }));

  let bpmn;
  if (includeBPMN) {
    const result = await getProcessBpmn(processDefinitionsId);
    if (result.isErr()) return result;

    bpmn = result.value;
  }

  const convertedProcess = {
    ...process,
    //versions: convertedVersions,
    bpmn,
    shareTimestamp:
      typeof process.shareTimestamp === 'bigint'
        ? Number(process.shareTimestamp)
        : process.shareTimestamp,
    allowIframeTimestamp:
      typeof process.allowIframeTimestamp === 'bigint'
        ? Number(process.allowIframeTimestamp)
        : process.allowIframeTimestamp,
    // TODO: implement inEditingBy
  };

  return ok(
    convertedProcess as typeof convertedProcess & {
      inEditingBy?: { id: string; task?: string }[];
    },
  );
}

/**
 * Throws if process with given id doesn't exist
 *
 * @param {String} processDefinitionsId
 */
export async function checkIfProcessExists(
  processDefinitionsId: string,
  throwError: boolean = true,
) {
  const existingProcess = await db.process.findUnique({
    where: {
      id: processDefinitionsId,
    },
  });
  if (!existingProcess && throwError) {
    return err(new Error(`Process with id ${processDefinitionsId} does not exist!`));
  }
  return ok(existingProcess);
}

export async function checkIfProcessAlreadyExistsForAUserInASpaceByName(
  processName: string,
  spaceId: string,
  userId: string,
  folderId: string,
) {
  try {
    const existingProcess = await db.process.findUnique({
      where: {
        name_environmentId_creatorId_folderId: {
          name: processName,
          environmentId: spaceId,
          creatorId: userId,
          folderId: folderId,
        },
      },
    });

    return ok(!!existingProcess);
  } catch (error: any) {
    return err(new Error('Error checking if process exists by name:', error.message));
  }
}

export async function checkIfProcessAlreadyExistsForAUserInASpaceByNameWithBatching(
  processes: { name: string; folderId: string }[],
  spaceId: string,
  userId: string,
) {
  try {
    const existingProcesses = await db.process.findMany({
      where: {
        AND: [
          { environmentId: spaceId },
          { creatorId: userId },
          {
            OR: processes.map(({ name, folderId }) => ({
              name,
              folderId,
            })),
          },
        ],
      },
      select: {
        name: true,
        folderId: true,
      },
    });

    // Turn into a Set or Map for fast lookup
    const existingSet = new Set(existingProcesses.map((p) => `${p.name}:::${p.folderId}`));

    // Return an array of booleans per process
    return ok(processes.map(({ name, folderId }) => existingSet.has(`${name}:::${folderId}`)));
  } catch (error: any) {
    return err(new Error(`Error checking process names in batch: ${error.message}`));
  }
}

/** Handles adding a process, makes sure all necessary information gets parsed from bpmn */
export const addProcess = ensureTransactionWrapper(_addProcess, 2);
export async function _addProcess(
  processInput: ProcessServerInput & { bpmn: string },
  referencedProcessId?: string,
  _tx?: Prisma.TransactionClient,
) {
  const tx = _tx!;

  const { bpmn } = processInput;
  if (!bpmn) {
    return err(new Error("Can't create a process without a bpmn!"));
  }
  const parseResult = ProcessServerInputSchema.safeParse(processInput);
  if (!parseResult.success) {
    return err(parseResult.error);
  }
  const processData = parseResult.data;

  // create meta info object
  const metadata = {
    ...getDefaultProcessMetaInfo(),
    ...processData,
    ...(await getProcessInfo(bpmn)),
  };

  if (!metadata.folderId) {
    const rootFolder = await getRootFolder(metadata.environmentId);
    if (rootFolder.isErr()) return rootFolder;
    metadata.folderId = rootFolder.value.id;
  }

  const folderData = await getFolderById(metadata.folderId);
  if (folderData.isErr()) return folderData;
  if (!folderData.value) return err(new Error('Folder not found'));
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
    return err(new Error(`Process with id ${processDefinitionsId} already exists!`));
  }

  const bpmnWithPlaceholders = await transformBpmnAttributes(
    bpmn,
    BpmnAttributeType.DB_PLACEHOLDER,
  );

  // save process info
  await tx.process.create({
    data: {
      id: metadata.id,
      originalId: metadata.originalId ?? '',
      name: metadata.name,
      description: metadata.description,
      createdOn: new Date().toISOString(),
      lastEditedOn: new Date().toISOString(),
      type: metadata.type,
      processIds: { set: metadata.processIds },
      folderId: metadata.folderId,
      sharedAs: metadata.sharedAs,
      shareTimestamp: metadata.shareTimestamp,
      allowIframeTimestamp: metadata.allowIframeTimestamp,
      environmentId: metadata.environmentId,
      creatorId: metadata.creatorId,
      userDefinedId: metadata.userDefinedId,
      //departments: { set: metadata.departments },
      //variables: { set: metadata.variables },
      bpmn: bpmnWithPlaceholders,
      executable: metadata.executable || false,
    },
  });

  //if referencedProcessId is present, the process was copied from a shared process
  if (referencedProcessId) {
    const artifacts = await tx.artifact.findMany({
      where: { processReferences: { some: { id: referencedProcessId } } },
    });

    for (const artifact of artifacts) {
      await tx.artifact.update({
        where: { id: artifact.id },
        data: { processReferences: { connect: [{ id: processDefinitionsId }] } },
      });
    }
  }

  eventHandler.dispatch('processAdded', { process: metadata });

  return ok(metadata as ProcessMetadata);
}

/** Updates an existing process with the given bpmn */
export const updateProcess = ensureTransactionWrapper(_updateProcess, 2);
export async function _updateProcess(
  processDefinitionsId: string,
  newInfoInput: Partial<ProcessServerInput> & { bpmn?: string },
  _tx?: Prisma.TransactionClient,
) {
  const { bpmn: newBpmn } = newInfoInput;
  const parseResult = ProcessServerInputSchema.partial().safeParse(newInfoInput);
  if (!parseResult.success) {
    return err(parseResult.error);
  }
  const newInfo = parseResult.data;

  const process = await getProcess(processDefinitionsId);
  if (process.isErr()) return process;

  const currentParent = process.value.folderId;

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
    const moveResult = await moveProcess({
      processDefinitionsId,
      newFolderId: metaChanges.folderId,
    });
    if (moveResult.isErr()) return moveResult;
    //delete metaChanges.folderId;
  }

  const newMetaData = await updateProcessMetaData(processDefinitionsId, metaChanges);
  if (newMetaData.isErr()) return newMetaData;
  if (newBpmn) {
    try {
      await db.process.update({
        where: { id: processDefinitionsId },
        data: { bpmn: await transformBpmnAttributes(newBpmn, BpmnAttributeType.DB_PLACEHOLDER) },
      });
    } catch (error) {
      console.error('Error updating bpmn: ', error);
    }

    eventHandler.dispatch('backend_processXmlChanged', {
      definitionsId: processDefinitionsId,
      newXml: newBpmn,
    });
  }

  return ok(newMetaData);
}

export async function moveProcess({
  processDefinitionsId,
  newFolderId,
  ability,
  dontUpdateOldFolder = false,
  tx,
}: {
  processDefinitionsId: string;
  newFolderId: string;
  dontUpdateOldFolder?: boolean;
  ability?: Ability;
  tx?: Prisma.TransactionClient;
}) {
  const dbMutator = tx || db;
  try {
    const process = await getProcess(processDefinitionsId);
    if (process.isErr()) {
      return process;
    }
    if (!process.value) {
      return err(new Error('Process not found'));
    }

    const oldFolderId = process.value.folderId;
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
      return err(new Error("Consistency Error: Process' old folder not found"));
    }
    if (!newFolder) {
      return err(new Error('New folder not found'));
    }

    // Permission checks
    if (
      ability &&
      !(
        ability.can('update', toCaslResource('Process', process.value)) &&
        ability.can('update', toCaslResource('Folder', oldFolder)) &&
        ability.can('update', toCaslResource('Folder', newFolder))
      )
    ) {
      return err(new Error('Unauthorized'));
    }

    // Update process' folderId in the database
    const updatedProcess = await dbMutator.process.update({
      where: { id: processDefinitionsId },
      data: {
        folderId: newFolderId,
      },
    });
    return ok(updatedProcess);
  } catch (error) {
    console.error('Error moving process:', error);
    return err(error);
  }
}

/** Direct updates to process meta data, should mostly be used for internal changes (puppeteer client, electron) to avoid
 * parsing the bpmn unnecessarily */
export async function updateProcessMetaData(
  processDefinitionsId: string,
  metaChanges: Partial<Omit<ProcessMetadata, 'bpmn'>>,
) {
  try {
    const existingProcess = await db.process.findUnique({
      where: {
        id: processDefinitionsId,
      },
      select: { originalId: true },
    });

    const updatedProcess = await db.process.update({
      where: { id: processDefinitionsId },
      data: {
        ...(metaChanges as any),
        id: processDefinitionsId, // make sure the id is not changed
        originalId: existingProcess?.originalId || metaChanges.originalId, // originalId is only changed is not set yet
      },
    });

    eventHandler.dispatch('processUpdated', {
      oldId: processDefinitionsId,
      updatedInfo: updatedProcess,
    });

    return ok(updatedProcess);
  } catch (error) {
    console.error('Error updating process metadata:', error);
    return err(error);
  }
}

/** Removes an existing process */
export const removeProcess = ensureTransactionWrapper(_removeProcess, 1);
export async function _removeProcess(processDefinitionsId: string, _tx?: Prisma.TransactionClient) {
  try {
    const tx = _tx!;

    const process = await tx.process.findUnique({
      where: { id: processDefinitionsId },
      include: { artifactProcessReferences: { include: { artifact: true } } },
    });

    if (!process) {
      return err(new Error(`Process with id: ${processDefinitionsId} not found`));
    }

    await Promise.all(
      process.artifactProcessReferences.map((artifactRef) => {
        return deleteProcessArtifact(artifactRef.artifact.filePath, true, processDefinitionsId, tx);
      }),
    );

    await tx.process.delete({ where: { id: processDefinitionsId } });

    eventHandler.dispatch('processRemoved', { processDefinitionsId });

    return ok();
  } catch (error) {
    console.error(error);
    return err(error);
  }
}

/** Stores a new version of an existing process */
export async function addProcessVersion(
  processDefinitionsId: string,
  bpmn: string,
  versionedProcessStartFormFilenames?: string[],
  versionedUserTaskFilenames?: string[],
  versionedScriptTaskFilenames?: string[],
) {
  // get the version from the given bpmn

  let versionInformation = await getDefinitionsVersionInformation(bpmn);
  if (!versionInformation) {
    return err(new Error('The given bpmn does not contain a version.'));
  }

  const existingProcess = await getProcess(processDefinitionsId);
  if (existingProcess.isErr()) {
    return existingProcess;
  }
  if (!existingProcess.value) {
    return err(new Error('The process for which you try to create a version does not exist'));
  }

  if (
    existingProcess.value.type !== 'project' &&
    (!versionInformation.name || !versionInformation.description)
  ) {
    return err(
      new Error(
        'A bpmn that should be stored as a version of a process has to contain both a version name and a version description!',
      ),
    );
  }

  // don't add a version a second time

  if (
    existingProcess.value.versions.some(
      ({ createdOn }) => toCustomUTCString(createdOn) == versionInformation.versionCreatedOn,
    )
  ) {
    return;
  }
  // save the new version in the directory of the process
  const res = await saveProcessArtifact(
    processDefinitionsId,
    `${versionInformation.versionCreatedOn}/${processDefinitionsId}.bpmn`,
    'application/xml',
    Buffer.from(bpmn),
    { useDefaultArtifactsTable: false, generateNewFileName: false },
  );

  if (!res.filePath) {
    return err(new Error('Error saving version bpmn'));
  }

  try {
    const version = await db.version.create({
      data: {
        id: versionInformation.versionId,
        name: versionInformation.name ?? '',
        description: versionInformation.description ?? '',
        versionBasedOn: versionInformation.versionBasedOn!,
        process: { connect: { id: processDefinitionsId } },
        bpmnFilePath: res.filePath,
      },
    });

    if (version) {
      if (versionedProcessStartFormFilenames) {
        await asyncMap(versionedProcessStartFormFilenames, async (fileName) => {
          for (const extension of ['.json', '.html']) {
            const res = await getArtifactMetaData(`${fileName}${extension}`, false);
            if (res) {
              await db.artifactVersionReference.create({
                data: { artifactId: res.id, versionId: version.id },
              });
            }
          }
        });
      }
      if (versionedUserTaskFilenames) {
        await asyncMap(versionedUserTaskFilenames, async (fileName) => {
          for (const extension of ['.json', '.html']) {
            const res = await getArtifactMetaData(`${fileName}${extension}`, false);
            if (res) {
              await db.artifactVersionReference.create({
                data: { artifactId: res.id, versionId: version.id },
              });
            }
          }
        });
      }
      if (versionedScriptTaskFilenames) {
        await asyncMap(versionedScriptTaskFilenames, async (filename) => {
          for (const extension of ['.js', '.ts', '.xml']) {
            const res = await getArtifactMetaData(`${filename}${extension}`, false);
            if (res) {
              await db.artifactVersionReference.create({
                data: { artifactId: res.id, versionId: version.id },
              });
            }
          }
        });
      }
    }

    const versionResult = await versionProcessArtifactRefs(processDefinitionsId, version.id);
    if (versionResult.isErr()) {
      return versionResult;
    }
  } catch (error) {
    console.error('Error creating version: ', error);
    return err(new Error('Error creating the version'));
  }

  // add information about the new version to the meta information and inform others about its existence
  const newVersions = existingProcess.value.versions ? [...existingProcess.value.versions] : [];

  //@ts-ignore
  newVersions.push(versionInformation);
  newVersions.sort((a, b) => (b.createdOn > a.createdOn ? 1 : -1));
}

/** Returns the bpmn of a specific process version */
export async function getProcessVersionBpmn(processDefinitionsId: string, versionId: string) {
  let existingProcess = await getProcess(processDefinitionsId);
  if (existingProcess.isErr()) {
    return existingProcess;
  }
  if (!existingProcess.value) {
    return err(new Error('The process for which you try to get a version does not exist'));
  }
  const existingVersion = existingProcess.value.versions?.find(
    (existingVersionInfo) => existingVersionInfo.id === versionId,
  );

  if (!existingVersion) {
    return err(new Error('The version you are trying to get does not exist'));
  }

  const versn = await db.version.findUnique({
    where: { id: versionId },
  });

  const bpmn = ((await retrieveFile(versn?.bpmnFilePath!, false)) as Buffer).toString('utf8');
  return ok(bpmn);
}

/** Removes information from the meta data that would not be correct after a restart */
function removeExcessiveInformation(processInfo: Omit<ProcessMetadata, 'bpmn'>) {
  const newInfo = { ...processInfo };
  delete newInfo.inEditingBy;
  return newInfo;
}

/** Returns the process definition for the process with the given id */
export async function getProcessBpmn(processDefinitionsId: string, ability?: Ability) {
  try {
    const process = await db.process.findUnique({
      where: {
        id: processDefinitionsId,
      },
      select: {
        creator: { select: { id: true, firstName: true, lastName: true, username: true } },
        space: { select: { id: true, name: true } },
        bpmn: true,
        userDefinedId: true,
        createdOn: true,
        id: true,
        name: true,
        originalId: true,
        environmentId: true,
        executable: true,
      },
    });

    if (!process) {
      return err(new Error('Process not found'));
    }

    if (ability && !ability.can('view', toCaslResource('Process', process))) {
      return err(UnauthorizedError);
    }

    const processWithStringDate = {
      ...process,
      createdOn: process.createdOn.toISOString(),
    };
    let bpmnWithDBValue = await transformBpmnAttributes(
      processWithStringDate!,
      BpmnAttributeType.ACTUAL_VALUE,
    );
    return ok(bpmnWithDBValue);
  } catch (error) {
    logger.debug(`Error reading bpmn of process. Reason:\n${error}`);
    return err(new Error('Unable to find process bpmn!'));
  }
}

// TODO: usertask logic and image handling -> in file manager branch

/** Returns the filenames of the data for all user tasks in the given process */
export async function getProcessUserTasks(processDefinitionsId: string) {
  // TODO
}

export type FolderContentWithScriptTasks = {
  folderId: string;
  content: (
    | {
        type: 'process';
        id: string;
        name: string;
        scriptTasks: string[];
      }
    | {
        type: 'folder';
        id: string;
        name: string;
      }
  )[];
};
/*
 * Returns the id, name and list of scriptTask filenames of all processes with scriptTasks.
 */
export async function getFolderScriptTasks(
  spaceId: string,
  folderId?: string,
  ability?: Ability,
  skipFolderCheck = false,
) {
  // If there is a folder id the permissions will be checked by getRootFolder
  if (!skipFolderCheck && folderId) {
    // returns an error if the user doesn't have permissions
    const res = await getFolderById(folderId, ability);
    if (res.isErr()) return res;
  }

  if (!folderId) {
    // returns an error if the user doesn't have permissions
    const rootFolder = await getRootFolder(spaceId, skipFolderCheck ? undefined : ability);

    if (rootFolder.isErr()) return rootFolder;

    folderId = rootFolder.value.id;
  }

  const [processes, folders] = await Promise.all([
    db.process.findMany({
      where: {
        environmentId: spaceId,
        folderId,
      },
      select: {
        id: true,
        name: true,
        bpmn: true,
      },
    }),
    db.folder.findMany({
      where: {
        environmentId: spaceId,
        parentId: folderId,
      },
      select: {
        name: true,
        id: true,
        // We need this for the permission check to work
        parentId: true,
      },
    }),
  ]);

  // TODO: subprocesses
  const processesWithScriptTaskFileNames: FolderContentWithScriptTasks['content'] = [];

  for (const folder of folders) {
    if (
      !ability ||
      ability.can('view', toCaslResource('Folder', folder), { environmentId: spaceId })
    ) {
      processesWithScriptTaskFileNames.push({
        type: 'folder',
        id: folder.id,
        name: folder.name,
      });
    }
  }

  for (const process of processes) {
    if (
      ability &&
      !ability.can('view', toCaslResource('Process', process), { environmentId: spaceId })
    ) {
      continue;
    }

    const scriptTasksFileNameMapping = await getScriptTaskFileNameMapping(process.bpmn);
    const scriptTaskFileNames = Object.values(scriptTasksFileNameMapping)
      .map((mapping) => mapping.fileName)
      .filter((v) => !!v) as string[];

    if (scriptTaskFileNames.length > 0) {
      processesWithScriptTaskFileNames.push({
        id: process.id,
        name: process.name,
        scriptTasks: scriptTaskFileNames,
        type: 'process',
      });
    }
  }

  return ok(processesWithScriptTaskFileNames);
}

/**
 * Returns an array containing the folders and processes with script tasks for every folder
 * starting at the `folderId` param and ending at the root folder of the environment.
 */
export async function getFolderPathScriptTasks(
  spaceId: string,
  folderId: string,
  ability?: Ability,
) {
  const results: FolderContentWithScriptTasks[] = [];

  // Start at folder and go up in the tree
  let currentFolderId: string | null = folderId;
  while (currentFolderId !== null) {
    // returns an error if the user doesn't have permissions
    const currentFolder = await getFolderById(currentFolderId, ability);
    if (currentFolder.isErr()) return currentFolder;

    const scriptTasks = await getFolderScriptTasks(spaceId, currentFolderId, ability, true);

    if (scriptTasks.isErr()) return scriptTasks;

    results.push({
      folderId: currentFolderId,
      content: scriptTasks.value,
    });

    currentFolderId = currentFolder.value.parentId;
  }

  return ok(results);
}

/** Returns the filenames of the data for all script tasks in the given process */
export async function getProcessScriptTasks(processDefinitionsId: string) {
  // TODO
}

export async function getProcessHtmlFormJSON(
  processDefinitionsId: string,
  fileName: string,
  ignoreDeletedStatus = false,
) {
  const check = await checkIfProcessExists(processDefinitionsId);
  if (check.isErr()) {
    return check;
  }

  try {
    let artifact;

    if (ignoreDeletedStatus) {
      artifact = await db.artifact.findFirst({ where: { fileName: `${fileName}.json` } });
    } else {
      let res = await db.artifactProcessReference.findFirst({
        where: { processId: processDefinitionsId, artifact: { fileName: `${fileName}.json` } },
        select: { artifact: true },
      });

      if (!res) {
        res = await db.artifactVersionReference.findFirst({
          where: {
            version: { processId: processDefinitionsId },
            artifact: { fileName: `${fileName}.json` },
          },
          select: { artifact: true },
        });
      }

      artifact = res?.artifact;
    }
    if (artifact) {
      const jsonAsBuffer = (await retrieveFile(artifact.filePath, true)) as Buffer;
      return ok(jsonAsBuffer.toString('utf8'));
    } else {
      return ok(undefined);
    }
  } catch (error) {
    logger.debug(`Error getting data of process html form ${fileName}. Reason\n${error}`);
    return err(new Error(`Unable to get data for process html form ${fileName}!`));
  }
}

export async function checkIfHtmlFormExists(processDefinitionsId: string, fileName: string) {
  try {
    const jsonArtifact = await db.artifact.findUnique({
      where: { fileName: `${fileName}.json` },
    });
    const htmlArtifact = await db.artifact.findUnique({
      where: { fileName: `${fileName}.html` },
    });
    return ok(jsonArtifact || htmlArtifact ? { json: jsonArtifact, html: htmlArtifact } : null);
  } catch (error) {
    console.error(`Error checking if html form ${fileName} exists:`, error);
    return err(new Error(`Failed to check if html form ${fileName} exists.`));
  }
}

export async function checkIfScriptTaskFileExists(
  processDefinitionsId: string,
  scriptFilenameWithExtension: string,
) {
  try {
    // const artifact = await db.artifact.findFirst({
    //   where: {
    //     artifactType: 'user-tasks',
    //     fileName: `${userTaskId}.json`,
    //     references: {
    //       some: {
    //         processId: processDefinitionsId,
    //       },
    //     },
    //   },
    //   include: {
    //     references: {
    //       where: {
    //         processId: processDefinitionsId,
    //       },
    //       select: {
    //         id: true,
    //         processId: true,
    //       },
    //     },
    //   },
    // });
    const artifact = await db.artifact.findUnique({
      where: { fileName: scriptFilenameWithExtension },
    });
    return ok(artifact);
  } catch (error) {
    console.error('Error checking if script task file exists:', error);
    return err(new Error('Failed to check if script task file exists.'));
  }
}

export async function getHtmlForm(processDefinitionsId: string, fileName: string) {
  const check = await checkIfProcessExists(processDefinitionsId);
  if (check.isErr()) {
    return check;
  }

  try {
    const res = await db.artifact.findFirst({
      where: {
        fileName: `${fileName}.html`,
        OR: [
          {
            processReferences: {
              some: {
                processId: processDefinitionsId,
              },
            },
          },
          {
            versionReferences: {
              some: { version: { processId: processDefinitionsId } },
            },
          },
        ],
      },
      select: {
        filePath: true,
      },
    });

    if (!res) {
      return err(new Error(`Unable to get html for ${fileName} from the database!`));
    }

    const html = (await retrieveFile(res.filePath, false)).toString('utf-8');
    return ok(html);
  } catch (error) {
    logger.debug(`Error getting html for ${fileName} from the database. Reason:\n${error}`);
    return err(new Error('Unable to get html for start form!'));
  }
}

export async function getProcessScriptTaskScript(processDefinitionsId: string, fileName: string) {
  const check = await checkIfProcessExists(processDefinitionsId);
  if (check.isErr()) {
    return check;
  }

  try {
    const res = await db.artifact.findFirst({
      where: {
        fileName,
        OR: [
          {
            processReferences: {
              some: {
                processId: processDefinitionsId,
              },
            },
          },
          {
            versionReferences: {
              some: { version: { processId: processDefinitionsId } },
            },
          },
        ],
      },
      select: {
        filePath: true,
      },
    });

    if (!res) {
      return err(new Error('Unable to get script for script task!'));
    }

    const script = (await retrieveFile(res.filePath, false)).toString('utf-8');
    return ok(script);
  } catch (error) {
    logger.debug(`Error getting script of script task. Reason:\n${error}`);
    return err(new Error('Unable to get script for script task!'));
  }
}

export async function saveProcessHtmlForm(
  processDefinitionsId: string,
  fileName: string,
  json: string,
  html: string,
  versionCreatedOn?: string,
  updateImageReferences = false,
) {
  // TODO: Use a transaction to avoid storing inconsistent states in case of errors
  const check = await checkIfProcessExists(processDefinitionsId);
  if (check.isErr()) {
    return check;
  }

  try {
    const res = await checkIfHtmlFormExists(processDefinitionsId, fileName);
    if (res.isErr()) {
      return res;
    }
    const content = new TextEncoder().encode(json);

    // The code that creates versions, already handles creating new references
    if (updateImageReferences && !versionCreatedOn) {
      let newUsedImages = getUsedImagesFromJson(JSON.parse(json));
      let removedImages = new Set<string>();

      if (res.value?.json) {
        const oldJson = await getProcessHtmlFormJSON(processDefinitionsId, fileName);
        if (oldJson.isErr()) return oldJson;
        if (!oldJson.value) return err(new Error(`Couldn't get JSON for user task ${fileName}`));

        const oldUsedImages = getUsedImagesFromJson(JSON.parse(oldJson.value));

        for (const oldImage of oldUsedImages) {
          if (!newUsedImages.has(oldImage)) removedImages.add(oldImage);
        }

        for (const oldImage of oldUsedImages) {
          if (newUsedImages.has(oldImage)) newUsedImages.delete(oldImage);
        }
      }

      for (const newArtifact of newUsedImages) {
        updateFileDeletableStatus(newArtifact, false, processDefinitionsId);
      }

      for (const deletedArtifact of removedImages) {
        updateFileDeletableStatus(deletedArtifact, true, processDefinitionsId);
      }
    }

    const { filePath } = await saveProcessArtifact(
      processDefinitionsId,
      `${fileName}.json`,
      'application/json',
      content,
      {
        generateNewFileName: false,
        versionCreatedOn,
        replaceFileContentOnly: res.value?.json?.filePath ? true : false,
        context: 'html-forms',
      },
    );

    await saveProcessArtifact(
      processDefinitionsId,
      `${fileName}.html`,
      'text/html',
      new TextEncoder().encode(html),
      {
        generateNewFileName: false,
        versionCreatedOn: versionCreatedOn,
        replaceFileContentOnly: res.value?.html?.filePath ? true : false,
        context: 'html-forms',
      },
    );

    return ok(filePath);
  } catch (error) {
    logger.debug(`Error storing html form data for ${fileName}. Reason:\n${error}`);
    return err(new Error('Failed to store the html form data.'));
  }
}

export async function saveProcessScriptTask(
  processDefinitionsId: string,
  filenameWithExtension: string,
  script: string,
  versionCreatedOn?: string,
) {
  const check = await checkIfProcessExists(processDefinitionsId);
  if (check.isErr()) {
    return check;
  }

  try {
    const res = await checkIfScriptTaskFileExists(processDefinitionsId, filenameWithExtension);
    if (res.isErr()) {
      return res;
    }

    await saveProcessArtifact(
      processDefinitionsId,
      filenameWithExtension,
      'application/javascript',
      new TextEncoder().encode(script),
      {
        generateNewFileName: false,
        versionCreatedOn: versionCreatedOn,
        replaceFileContentOnly: res.value?.filePath ? true : false,
        context: 'script-tasks',
      },
    );
    return ok(filenameWithExtension);
  } catch (error) {
    logger.debug(`Error storing script task data. Reason:\n${error}`);
    return err(new Error('Failed to store the script task data'));
  }
}

/** Removes a stored user task from disk */
export async function deleteHtmlForm(processDefinitionsId: string, fileName: string) {
  const check = await checkIfProcessExists(processDefinitionsId);
  if (check.isErr()) {
    return check;
  }

  try {
    const res = await checkIfHtmlFormExists(processDefinitionsId, fileName);
    if (res.isErr()) {
      return res;
    }

    let isDeleted = false;

    if (res.value?.json) {
      isDeleted = await deleteProcessArtifact(res.value.json.filePath, true);
    }
    if (res.value?.html) {
      isDeleted = (await deleteProcessArtifact(res.value.html.filePath, true)) || isDeleted;
    }

    return ok(isDeleted);
  } catch (error) {
    logger.debug(`Error removing html form data. Reason:\n${error}`);
    return err(error);
  }
}

/** Removes a stored script task from disk */
export async function deleteProcessScriptTask(
  processDefinitionsId: string,
  taskFileNameWithExtension: string,
) {
  const processExists = await checkIfProcessExists(processDefinitionsId);
  if (processExists.isErr()) {
    return processExists;
  }

  if (!processExists.value) return ok(true);

  try {
    const res = await checkIfScriptTaskFileExists(processDefinitionsId, taskFileNameWithExtension);
    if (res.isErr()) {
      return res;
    }
    if (res.value) {
      return ok(await deleteProcessArtifact(res.value?.filePath, true));
    }

    return ok(true);
  } catch (error) {
    logger.debug(`Error removing script task file. Reason:\n${error}`);
    return err(error);
  }
}

export async function copyProcessArtifactReferences(
  targetProcessId: string,
  destinationProcessId: string,
) {
  const refs = await db.artifactProcessReference.findMany({
    where: {
      processId: targetProcessId,
      artifact: { OR: [{ artifactType: 'images' }, { artifactType: 'others' }] },
    },
  });
  try {
    await asyncMap(refs, (targetRef) =>
      db.artifactProcessReference.create({
        data: {
          artifactId: targetRef.artifactId,
          processId: destinationProcessId,
        },
      }),
    );

    return ok();
  } catch (error) {
    return err(new Error('error copying process artifact references'));
  }
}

export async function versionProcessArtifactRefs(processId: string, versionId: string) {
  const refs = await db.artifactProcessReference.findMany({
    where: {
      processId: processId,
      artifact: { OR: [{ artifactType: 'images' }, { artifactType: 'others' }] },
    },
  });
  try {
    await asyncMap(refs, (targetRef) =>
      db.artifactVersionReference.create({
        data: {
          artifactId: targetRef.artifactId,
          versionId: versionId,
        },
      }),
    );

    return ok();
  } catch (error) {
    return err(new Error('error copying process artifact references'));
  }
}

// copy html-forms & script tasks....
export async function copyProcessFiles(sourceProcessId: string, destinationProcessId: string) {
  const refs = await db.artifactProcessReference.findMany({
    where: {
      processId: sourceProcessId,
      artifact: { NOT: [{ artifactType: 'images' }, { artifactType: 'others' }] },
    },
    select: {
      artifactId: true,
      artifact: { select: { filePath: true, fileName: true, artifactType: true } },
    },
  });

  const filenameMapping: Map<string, string> = new Map<string, string>();

  const oldNewFilenameMapping = await asyncMap(refs, async (ref) => {
    const { artifactId, artifact } = ref;
    const sourceFilePath = artifact.filePath;
    const fileNameParts = artifact.fileName.split('.');
    const ext = fileNameParts.pop();

    const baseName = fileNameParts.join('.');
    const typePrefix = baseName.split('_').slice(0, 2).join('_');
    const destinationFilePath = generateProcessFilePath(artifact.fileName, destinationProcessId);

    let newFileName;
    if (artifact.artifactType === 'html-forms' || artifact.artifactType === 'script-tasks') {
      newFileName = filenameMapping.get(baseName) || generateBpmnId(typePrefix + '_');
      filenameMapping.set(baseName, newFileName);
    }

    const { status, newFilename, newFilepath } = await copyFile(
      sourceFilePath,
      destinationFilePath,
      { newFilename: `${newFileName}.${ext}` },
    );
    if (status) {
      try {
        const { id: newArtifactId } = await db.artifact.create({
          data: {
            artifactType: artifact.artifactType,
            fileName: newFilename,
            filePath: newFilepath,
          },
        });

        await db.artifactProcessReference.create({
          data: { artifactId: newArtifactId, processId: destinationProcessId },
        });

        console.log(`Successfully copied artifact with ID ${artifactId} to ${newFilename}`);
        return ok({
          mapping: { oldFilename: artifact.fileName, newFilename: newFilename },
          artifactType: artifact.artifactType,
        });
      } catch (error) {
        console.error(
          `Failed to create new artifact for destination process: ${destinationProcessId}`,
        );
        return err(error);
      }
    } else {
      const error = new Error(`Failed to copy artifact with ID ${artifactId}`);
      console.warn(error.message);
      return err(error);
    }
  });

  return Result.combine(oldNewFilenameMapping);
}

export async function getProcessImage(processDefinitionsId: string, imageFileName: string) {
  const check = await checkIfProcessExists(processDefinitionsId, true);
  if (check.isErr()) return check;

  try {
    const res = await db.artifact.findFirst({
      where: {
        AND: [
          { fileName: imageFileName },
          { processReferences: { some: { processId: processDefinitionsId } } },
        ],
      },
      select: { filePath: true },
    });
    if (!res) {
      return err(new Error(`Unable to get image : ${imageFileName}`));
    }
    const image = (await retrieveFile(res?.filePath, false)) as Buffer;
    return ok(image);
  } catch (error) {
    logger.debug(`Error getting image. Reason:\n${error}`);
    return err(new Error(`Unable to get image : ${imageFileName}`));
  }
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
export async function blockProcess(socketId: string, processDefinitionsId: string) {
  // TODO
}

/** Removes the id of the socket wanting to unblock the process from the process object */
export async function unblockProcess(socketId: string, processDefinitionsId: string) {
  // TODO
}

export async function blockTask(socketId: string, processDefinitionsId: string, taskId: string) {
  // TODO
}

export async function unblockTask(socketId: string, processDefinitionsId: string, taskId: string) {
  // TODO
}

/** Will remove all instance adaptation processes that are stored */
function removeAdaptationProcesses(processes: ProcessMetadata[]) {
  // TODO
}
