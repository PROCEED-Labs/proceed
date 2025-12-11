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
  getAllElements,
  getDefinitionsVersionInformation,
  generateBpmnId,
  toBpmnObject,
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
      environmentId: true,
      creatorId: true,
      //departments: true,
      //variables: true,
      versions: true,
      bpmn: includeBPMN,
    },
  });

  //TODO: add pagination

  return ability ? ability.filter('view', 'Process', spaceProcesses) : spaceProcesses;
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
      environmentId: true,
      creatorId: true,
      //departments: true,
      //variables: true,
      versions: true,
    },
  });
  if (!process) {
    throw new Error(`Process with id ${processDefinitionsId} could not be found!`);
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

  const convertedProcess = {
    ...process,
    //versions: convertedVersions,
    bpmn: includeBPMN ? await getProcessBpmn(processDefinitionsId) : null,
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

  return convertedProcess as typeof convertedProcess & {
    inEditingBy?: { id: string; task?: string }[];
  };
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
    throw new Error(`Process with id ${processDefinitionsId} does not exist!`);
  }
  return existingProcess;
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

    return !!existingProcess;
  } catch (err: any) {
    throw new Error('Error checking if process exists by name:', err.message);
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
    return processes.map(({ name, folderId }) => {
      return existingSet.has(`${name}:::${folderId}`);
    });
  } catch (err: any) {
    throw new Error(`Error checking process names in batch: ${err.message}`);
  }
}

/** Handles adding a process, makes sure all necessary information gets parsed from bpmn */
export async function addProcess(
  processInput: ProcessServerInput & { bpmn: string },
  referencedProcessId?: string,
  tx?: Prisma.TransactionClient,
): Promise<ProcessMetadata> {
  if (!tx) {
    return await db.$transaction(async (trx: Prisma.TransactionClient) => {
      return await addProcess(processInput, referencedProcessId, trx);
    });
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

  const bpmnWithPlaceholders = await transformBpmnAttributes(
    bpmn,
    BpmnAttributeType.DB_PLACEHOLDER,
  );

  // save process info
  try {
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
      },
    });
  } catch (error) {
    console.error('Error adding new process: ', error);
  }

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

  return newMetaData;
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
    const updatedProcess = await dbMutator.process.update({
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
  try {
    const existingProcess = await checkIfProcessExists(processDefinitionsId);

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

    return updatedProcess;
  } catch (error) {
    console.error('Error updating process metadata:', error);
  }
}

/** Removes an existing process */
export async function removeProcess(processDefinitionsId: string, tx?: Prisma.TransactionClient) {
  if (!tx) {
    return await db.$transaction(async (trx: Prisma.TransactionClient) => {
      await removeProcess(processDefinitionsId, trx);
    });
  }

  const process = await tx.process.findUnique({
    where: { id: processDefinitionsId },
    include: { artifactProcessReferences: { include: { artifact: true } } },
  });

  if (!process) {
    throw new Error(`Process with id: ${processDefinitionsId} not found`);
  }

  await Promise.all(
    process.artifactProcessReferences.map((artifactRef) => {
      return deleteProcessArtifact(artifactRef.artifact.filePath, true, processDefinitionsId, tx);
    }),
  );

  await tx.process.delete({ where: { id: processDefinitionsId } });

  eventHandler.dispatch('processRemoved', { processDefinitionsId });
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

  if (
    existingProcess.versions.some(
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
    throw new Error('Error saving version bpmn');
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

    await versionProcessArtifactRefs(processDefinitionsId, version.id);
  } catch (error) {
    console.error('Error creating version: ', error);
    throw new Error('Error creating the version');
  }

  // add information about the new version to the meta information and inform others about its existence
  const newVersions = existingProcess.versions ? [...existingProcess.versions] : [];

  //@ts-ignore
  newVersions.push(versionInformation);
  newVersions.sort((a, b) => (b.createdOn > a.createdOn ? 1 : -1));
}

/** Returns the bpmn of a specific process version */
export async function getProcessVersionBpmn(processDefinitionsId: string, versionId: string) {
  let existingProcess = await getProcess(processDefinitionsId);
  if (!existingProcess) {
    throw new Error('The process for which you try to get a version does not exist');
  }
  const existingVersion = existingProcess.versions?.find(
    (existingVersionInfo) => existingVersionInfo.id === versionId,
  );

  if (!existingVersion) {
    throw new Error('The version you are trying to get does not exist');
  }

  const versn = await db.version.findUnique({
    where: { id: versionId },
  });

  return ((await retrieveFile(versn?.bpmnFilePath!, false)) as Buffer).toString('utf8');
}

/** Removes information from the meta data that would not be correct after a restart */
function removeExcessiveInformation(processInfo: Omit<ProcessMetadata, 'bpmn'>) {
  const newInfo = { ...processInfo };
  delete newInfo.inEditingBy;
  return newInfo;
}

/** Returns the process definition for the process with the given id */
export async function getProcessBpmn(processDefinitionsId: string) {
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
      },
    });

    if (!process) {
      throw new Error('Process not found');
    }

    const processWithStringDate = {
      ...process,
      createdOn: process.createdOn.toISOString(),
    };
    let bpmnWithDBValue = await transformBpmnAttributes(
      processWithStringDate!,
      BpmnAttributeType.ACTUAL_VALUE,
    );
    return bpmnWithDBValue;
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
    // Throws if the user doesn't have permissions
    await getFolderById(folderId, ability);
  }

  if (!folderId) {
    // Throws if the user doesn't have permissions

    const rootFolder = await getRootFolder(spaceId, skipFolderCheck ? undefined : ability);

    folderId = rootFolder.id;
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

    const bpmnObj = await toBpmnObject(process.bpmn);
    const allElements = getAllElements(bpmnObj);
    const scriptTaskFileNames = allElements
      .filter((el) => el.$type === 'bpmn:ScriptTask' && typeof el.fileName === 'string')
      .map((el) => el.fileName);

    if (scriptTaskFileNames.length > 0) {
      processesWithScriptTaskFileNames.push({
        id: process.id,
        name: process.name,
        scriptTasks: scriptTaskFileNames,
        type: 'process',
      });
    }
  }

  return processesWithScriptTaskFileNames;
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
    // Throws if the user doesn't have permissions
    const currentFolder = await getFolderById(currentFolderId, ability);

    results.push({
      folderId: currentFolderId,
      content: await getFolderScriptTasks(spaceId, currentFolderId, ability, true),
    });

    currentFolderId = currentFolder.parentId;
  }

  return results;
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
  checkIfProcessExists(processDefinitionsId);

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
      return jsonAsBuffer.toString('utf8');
    }
  } catch (err) {
    logger.debug(`Error getting data of process html form ${fileName}. Reason\n${err}`);
    throw new Error(`Unable to get data for process html form ${fileName}!`);
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
    return jsonArtifact || htmlArtifact ? { json: jsonArtifact, html: htmlArtifact } : null;
  } catch (error) {
    console.error(`Error checking if html form ${fileName} exists:`, error);
    throw new Error(`Failed to check if html form ${fileName} exists.`);
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
    return artifact;
  } catch (error) {
    console.error('Error checking if script task file exists:', error);
    throw new Error('Failed to check if script task file exists.');
  }
}

export async function getHtmlForm(processDefinitionsId: string, fileName: string) {
  checkIfProcessExists(processDefinitionsId);
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
      throw new Error(`Unable to get html for ${fileName} from the database!`);
    }

    const html = (await retrieveFile(res.filePath, false)).toString('utf-8');
    return html;
  } catch (err) {
    logger.debug(`Error getting html for ${fileName} from the database. Reason:\n${err}`);
    throw new Error('Unable to get html for start form!');
  }
}

export async function getProcessScriptTaskScript(processDefinitionsId: string, fileName: string) {
  checkIfProcessExists(processDefinitionsId);
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
      throw new Error('Unable to get script for script task!');
    }

    const script = (await retrieveFile(res.filePath, false)).toString('utf-8');
    return script;
  } catch (err) {
    logger.debug(`Error getting script of script task. Reason:\n${err}`);
    throw new Error('Unable to get script for script task!');
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
  checkIfProcessExists(processDefinitionsId);
  try {
    const res = await checkIfHtmlFormExists(processDefinitionsId, fileName);
    const content = new TextEncoder().encode(json);

    // The code that creates versions, already handles creating new references
    if (updateImageReferences && !versionCreatedOn) {
      let newUsedImages = getUsedImagesFromJson(JSON.parse(json));
      let removedImages = new Set<string>();

      if (res?.json) {
        const oldJson = await getProcessHtmlFormJSON(processDefinitionsId, fileName);
        if (!oldJson) throw new Error(`Couldn't get JSON for user task ${fileName}`);

        const oldUsedImages = getUsedImagesFromJson(JSON.parse(oldJson));

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
        replaceFileContentOnly: res?.json?.filePath ? true : false,
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
        replaceFileContentOnly: res?.html?.filePath ? true : false,
        context: 'html-forms',
      },
    );

    return filePath;
  } catch (err) {
    logger.debug(`Error storing html form data for ${fileName}. Reason:\n${err}`);
    throw new Error('Failed to store the html form data.');
  }
}

export async function saveProcessScriptTask(
  processDefinitionsId: string,
  filenameWithExtension: string,
  script: string,
  versionCreatedOn?: string,
) {
  checkIfProcessExists(processDefinitionsId);
  try {
    const res = await checkIfScriptTaskFileExists(processDefinitionsId, filenameWithExtension);

    await saveProcessArtifact(
      processDefinitionsId,
      filenameWithExtension,
      'application/javascript',
      new TextEncoder().encode(script),
      {
        generateNewFileName: false,
        versionCreatedOn: versionCreatedOn,
        replaceFileContentOnly: res?.filePath ? true : false,
        context: 'script-tasks',
      },
    );
    return filenameWithExtension;
  } catch (err) {
    logger.debug(`Error storing script task data. Reason:\n${err}`);
    throw new Error('Failed to store the script task data');
  }
}

/** Removes a stored user task from disk */
export async function deleteHtmlForm(processDefinitionsId: string, fileName: string) {
  checkIfProcessExists(processDefinitionsId);
  try {
    const res = await checkIfHtmlFormExists(processDefinitionsId, fileName);

    let isDeleted = false;

    if (res?.json) {
      isDeleted = await deleteProcessArtifact(res.json.filePath, true);
    }
    if (res?.html) {
      isDeleted = (await deleteProcessArtifact(res.html.filePath, true)) || isDeleted;
    }

    return isDeleted;
  } catch (err) {
    logger.debug(`Error removing html form data. Reason:\n${err}`);
  }
}

/** Removes a stored script task from disk */
export async function deleteProcessScriptTask(
  processDefinitionsId: string,
  taskFileNameWithExtension: string,
) {
  checkIfProcessExists(processDefinitionsId);
  try {
    const res = await checkIfScriptTaskFileExists(processDefinitionsId, taskFileNameWithExtension);
    if (res) {
      return await deleteProcessArtifact(res.filePath, true);
    }
  } catch (err) {
    logger.debug(`Error removing script task file. Reason:\n${err}`);
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
  } catch (error) {
    throw new Error('error copying process artifact references');
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
  } catch (error) {
    throw new Error('error copying process artifact references');
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
        return {
          mapping: { oldFilename: artifact.fileName, newFilename: newFilename },
          artifactType: artifact.artifactType,
        };
      } catch (error) {
        console.error(
          `Failed to create new artifact for destination process: ${destinationProcessId}`,
        );
      }
    } else {
      console.warn(`Failed to copy artifact with ID ${artifactId}`);
    }
  });

  return oldNewFilenameMapping;
}

export async function getProcessImage(processDefinitionsId: string, imageFileName: string) {
  checkIfProcessExists(processDefinitionsId);

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
      throw new Error(`Unable to get image : ${imageFileName}`);
    }
    const image = (await retrieveFile(res?.filePath, false)) as Buffer;
    return image;
  } catch (err) {
    logger.debug(`Error getting image. Reason:\n${err}`);
    throw new Error(`Unable to get image : ${imageFileName}`);
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
