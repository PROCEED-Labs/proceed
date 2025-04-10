import { getFolderById } from './folders';
import eventHandler from '../legacy/eventHandler.js';
import logger from '../legacy/logging.js';
import { getProcessInfo, getDefaultProcessMetaInfo } from '../../helpers/processHelpers';
import {
  getDefinitionsVersionInformation,
  getMetaDataFromElement,
  getAllElements,
} from '@proceed/bpmn-helper';
import Ability from '@/lib/ability/abilityHelper';
import { ProcessMetadata, ProcessServerInput, ProcessServerInputSchema } from '../process-schema';
import { getRootFolder } from './folders';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';

import {
  deleteProcessArtifact,
  getArtifactMetaData,
  retrieveProcessArtifact,
  saveProcessArtifact,
} from '../file-manager-facade';
import { toCustomUTCString } from '@/lib/helpers/timeHelper';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { copyFile } from '../file-manager/file-manager';
import { generateProcessFilePath } from '@/lib/helpers/fileManagerHelpers';
import { Prisma } from '@prisma/client';

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
    bpmn: `<?xml version="1.0" encoding="UTF-8"?>${process.bpmn}`,
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
        //departments: { set: metadata.departments },
        //variables: { set: metadata.variables },
        bpmn: bpmn,
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
        data: { bpmn: newBpmn },
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
  checkIfProcessExists(processDefinitionsId);
  try {
    const updatedProcess = await db.process.update({
      where: { id: processDefinitionsId },
      data: {
        ...(metaChanges as any),
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

  if (!res.fileName) {
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
        bpmnFilePath: res.fileName,
      },
    });

    if (version) {
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

  return (
    (await retrieveProcessArtifact(
      processDefinitionsId,
      versn?.bpmnFilePath!,
      false,
      false,
    )) as Buffer
  ).toString('utf8');
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
    return `<?xml version="1.0" encoding="UTF-8"?>\n${process?.bpmn}`;
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

/** Returns the filenames of the data for all script tasks in the given process */
export async function getProcessScriptTasks(processDefinitionsId: string) {
  // TODO
}

/** Returns the form data for a specific user task in a process */
export async function getProcessUserTaskJSON(processDefinitionsId: string, userTaskName: string) {
  checkIfProcessExists(processDefinitionsId);

  try {
    const res = await db.artifact.findUnique({ where: { fileName: `${userTaskName}.json` } });
    if (res) {
      const jsonAsBuffer = (await retrieveProcessArtifact(
        processDefinitionsId,
        res.filePath,
        true,
        true,
      )) as Buffer;
      return jsonAsBuffer.toString('utf8');
    }
  } catch (err) {
    logger.debug(`Error getting data of user task. Reason:\n${err}`);
    throw new Error('Unable to get data for user task!');
  }
}

export async function checkIfUserTaskExists(processDefinitionsId: string, userTaskId: string) {
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
    const jsonArtifact = await db.artifact.findUnique({
      where: { fileName: `${userTaskId}.json` },
    });
    const htmlArtifact = await db.artifact.findUnique({
      where: { fileName: `${userTaskId}.html` },
    });
    return jsonArtifact || htmlArtifact ? { json: jsonArtifact, html: htmlArtifact } : null;
  } catch (error) {
    console.error('Error checking if user task exists:', error);
    throw new Error('Failed to check if user task exists.');
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

export async function getProcessUserTaskHtml(processDefinitionsId: string, taskFileName: string) {
  checkIfProcessExists(processDefinitionsId);
  try {
    const res = await db.artifact.findFirst({
      where: {
        fileName: `${taskFileName}.html`,
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
      throw new Error('Unable to get html for user task!');
    }

    const html = (
      await retrieveProcessArtifact(processDefinitionsId, res.filePath, true, false)
    ).toString('utf-8');
    return html;
  } catch (err) {
    logger.debug(`Error getting html of user task. Reason:\n${err}`);
    throw new Error('Unable to get html for user task!');
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

    const script = (
      await retrieveProcessArtifact(processDefinitionsId, res.filePath, true, false)
    ).toString('utf-8');
    return script;
  } catch (err) {
    logger.debug(`Error getting script of script task. Reason:\n${err}`);
    throw new Error('Unable to get script for script task!');
  }
}

export async function saveProcessUserTask(
  processDefinitionsId: string,
  userTaskId: string,
  json: string,
  html: string,
  versionCreatedOn?: string,
) {
  checkIfProcessExists(processDefinitionsId);
  try {
    const res = await checkIfUserTaskExists(processDefinitionsId, userTaskId);
    const content = new TextEncoder().encode(json);
    const { fileName } = await saveProcessArtifact(
      processDefinitionsId,
      `${userTaskId}.json`,
      'application/json',
      content,
      {
        generateNewFileName: false,
        versionCreatedOn: versionCreatedOn,
        replaceFileContentOnly: res?.json?.filePath ? true : false,
        context: 'user-tasks',
      },
    );

    await saveProcessArtifact(
      processDefinitionsId,
      `${userTaskId}.html`,
      'text/html',
      new TextEncoder().encode(html),
      {
        generateNewFileName: false,
        versionCreatedOn: versionCreatedOn,
        replaceFileContentOnly: res?.html?.filePath ? true : false,
        context: 'user-tasks',
      },
    );
    return fileName;
  } catch (err) {
    logger.debug(`Error storing user task data. Reason:\n${err}`);
    throw new Error('Failed to store the user task data');
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
export async function deleteProcessUserTask(
  processDefinitionsId: string,
  userTaskFileName: string,
) {
  checkIfProcessExists(processDefinitionsId);
  try {
    const res = await checkIfUserTaskExists(processDefinitionsId, userTaskFileName);

    let isDeleted = false;

    if (res?.json) {
      isDeleted = await deleteProcessArtifact(res.json.filePath, true);
    }
    if (res?.html) {
      isDeleted = (await deleteProcessArtifact(res.html.filePath, true)) || isDeleted;
    }

    return isDeleted;
  } catch (err) {
    logger.debug(`Error removing user task data. Reason:\n${err}`);
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

// copy usertasks & script tasks....
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

  const oldNewFilenameMapping = await asyncMap(refs, async (ref) => {
    const { artifactId, artifact } = ref;
    const sourceFilePath = artifact.filePath;
    const destinationFilePath = generateProcessFilePath(artifact.fileName, destinationProcessId);
    const { status, newFilename, newFilepath } = await copyFile(
      sourceFilePath,
      destinationFilePath,
      {
        newFilename: `${destinationProcessId}-${artifact.fileName}`,
      },
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
      throw new Error('Unable to get image!');
    }
    const image = (await retrieveProcessArtifact(
      processDefinitionsId,
      res?.filePath,
      true,
      false,
    )) as Buffer;
    return image;
  } catch (err) {
    logger.debug(`Error getting image. Reason:\n${err}`);
    throw new Error('Unable to get image!');
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
