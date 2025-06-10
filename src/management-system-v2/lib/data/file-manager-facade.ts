'use server';

import {
  getFileCategory,
  getNewFileName,
  EntityType,
  ArtifactType,
  generateProcessFilePath,
} from '../helpers/fileManagerHelpers';
import { contentTypeNotAllowed } from './content-upload-error';
import { copyFile, deleteFile, retrieveFile, saveFile } from './file-manager/file-manager';
import db from '@/lib/data/db';
import { getProcessUserTaskJSON } from './db/process';
import { asyncMap, findKey } from '../helpers/javascriptHelpers';
import { env } from '../env-vars';
import { Prisma } from '@prisma/client';
import { use } from 'react';
import { checkValidity } from './processes';

const DEPLOYMENT_ENV = env.PROCEED_PUBLIC_DEPLOYMENT_ENV;

// Allowed content types for files
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'text/html',
  'application/pdf',
  'application/javascript',
  'application/xml',
];

const isContentTypeAllowed = (mimeType: string): boolean => {
  return ALLOWED_CONTENT_TYPES.includes(mimeType);
};

interface SaveArtifactOptions {
  versionCreatedOn?: string;
  processId: string;
}

export const saveArtifactToDB = async (
  fileName: string,
  filePath: string,
  artifactType: ArtifactType,
  options: SaveArtifactOptions,
) => {
  try {
    const { versionCreatedOn, processId } = options;
    const data = {
      fileName,
      filePath,
      artifactType,
      ...(versionCreatedOn ? undefined : { processReferences: { create: { processId } } }),
    };

    const artifact = await db.artifact.create({ data });

    return artifact;
  } catch (error) {
    console.error(`Error saving artifact to DB for file: ${fileName}, rolling back...`, error);

    // Rollback: Delete the uploaded file if DB operation fails
    try {
      await deleteFile(filePath);
      console.info(`Rollback successful: Deleted file ${filePath}`);
    } catch (fsError) {
      console.error(`Rollback failed: Could not delete file ${filePath}`, fsError);
    }

    throw new Error(`Failed to save artifact metadata, rollback completed for file: ${fileName}`);
  }
};

const removeArtifactFromDB = async (filePath: string, tx?: Prisma.TransactionClient) => {
  const dbMutator = tx || db;
  return dbMutator.artifact.delete({
    where: { filePath },
  });
};

export const cleanUpFailedUploadEntry = async (
  spaceId: string,
  entityId: string,
  entityType: EntityType,
  fileName: string,
) => {
  if (EntityType.ORGANIZATION === entityType) {
    // Maybe add ability check here, if the user is admin of the organisation
    try {
      await db.space.update({ where: { id: entityId }, data: { spaceLogo: null } });
      return true;
    } catch (error) {
      console.error('Failed to clean up failed upload entry:', error);
      return false;
    }
  } else if (EntityType.PROCESS === entityType) {
    const ability = await checkValidity(entityId, 'delete', spaceId);
    if (ability?.error) {
      throw new Error('User does not have permission to delete the file');
    }
    try {
      const artifact = await db.artifact.findUnique({ where: { fileName } });
      await db.artifactProcessReference.deleteMany({ where: { artifactId: artifact?.id } });
      await db.artifact.delete({ where: { fileName } });
      return true;
    } catch (error) {
      console.error('Failed to clean up failed upload entry:', error);
      return false;
    }
  }
};

export async function getArtifactMetaData(fileNameOrPath: string, isFilePath: boolean) {
  return await db.artifact.findUnique({
    where: isFilePath ? { filePath: fileNameOrPath } : { fileName: fileNameOrPath },
  });
}

// Save a file associated with an entity (process, organization, etc.)
export async function saveEntityFile(
  entityType: EntityType,
  entityId: string,
  mimeType: string,
  fileName: string,
  fileContent?: Buffer | Uint8Array,
) {
  if (!isContentTypeAllowed(mimeType)) {
    throw new Error(`Content type '${mimeType}' is not allowed`);
  }

  switch (entityType) {
    case EntityType.PROCESS:
      return saveProcessArtifact(entityId, fileName, mimeType, fileContent);
    case EntityType.ORGANIZATION:
      return saveOrganizationLogo(entityId, fileName, mimeType, fileContent);
    // Extend for other entity types if needed
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

// Retrieve a file associated with an entity
export async function retrieveEntityFile(
  entityType: EntityType,
  entityId: string,
  filePath?: string,
) {
  switch (entityType) {
    case EntityType.PROCESS:
      if (!filePath) throw new Error('File name is required for process artifacts');
      return retrieveFile(filePath, true);
    case EntityType.ORGANIZATION:
      return getOrganizationLogo(entityId);
    // Extend for other entity types if needed
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

// Delete a file associated with an entity
export async function deleteEntityFile(
  entityType: EntityType,
  entityId: string,
  fileName?: string,
): Promise<boolean> {
  switch (entityType) {
    case EntityType.PROCESS:
      if (!fileName) throw new Error('File name is required for process artifacts');
      return deleteProcessArtifact(fileName, false, entityId);
    case EntityType.ORGANIZATION:
      return deleteOrganizationLogo(entityId);
    // Extend for other entity types if needed
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

interface SaveProcessArtifactOptions {
  generateNewFileName?: boolean;
  useDefaultArtifactsTable?: boolean;
  versionCreatedOn?: string;
  replaceFileContentOnly?: boolean;
  context?: ArtifactType; // option to override the file category in case of collision ( eg: xml extension is used for usertask and bpmn both)
}

// Functionality for handling process artifact files
export async function saveProcessArtifact(
  processId: string,
  fileName: string,
  mimeType: string,
  fileContent?: Buffer | Uint8Array,
  options: SaveProcessArtifactOptions = {},
) {
  const {
    generateNewFileName = true,
    useDefaultArtifactsTable = true,
    versionCreatedOn,
    replaceFileContentOnly = false,
    context,
  } = options;

  const newFileName = generateNewFileName ? getNewFileName(fileName) : fileName;
  const artifactType = context || getFileCategory(fileName, mimeType);
  const filePath = generateProcessFilePath(newFileName, processId, mimeType, versionCreatedOn);
  const usePresignedUrl = ['images', 'others'].includes(artifactType);

  try {
    if (!generateNewFileName && !replaceFileContentOnly) {
      const artifact = await getArtifactMetaData(newFileName, false);
      // if artifact already exists, update the reference and return
      if (artifact) {
        await db.artifactProcessReference.create({ data: { artifactId: artifact.id, processId } });
        return { presignedUrl: null, fileName: newFileName };
      }
    }
    // Save the file (local or presigned URL)
    const { presignedUrl, status } = await saveFile(
      filePath,
      mimeType,
      fileContent,
      usePresignedUrl,
    );

    // If only replacing file content, skip DB update
    if (replaceFileContentOnly) {
      return { presignedUrl, status };
    }

    if (useDefaultArtifactsTable) {
      await saveArtifactToDB(newFileName, filePath, artifactType, {
        processId,
        versionCreatedOn,
      });
    }

    return { presignedUrl, filePath };
  } catch (error) {
    console.error(
      `Failed to save process artifact (${artifactType}, ${fileName}) for process ${processId}:`,
      error,
    );
    return { presignedUrl: null, fileName: null };
  }
}

// Delete a process artifact
export async function deleteProcessArtifact(
  fileNameOrPath: string,
  isFilePath = false,
  processId?: string,
  tx?: Prisma.TransactionClient,
): Promise<boolean> {
  const dbMutator = tx || db;

  const artifact = await getArtifactMetaData(fileNameOrPath, isFilePath);
  if (!artifact) {
    throw new Error(`Artifact "${fileNameOrPath}" not found`);
  }

  if (processId) {
    // Remove the reference between artifact and process
    await dbMutator.artifactProcessReference.deleteMany({
      where: {
        artifactId: artifact.id,
        processId: processId,
      },
    });
  }
  // Check if there are any remaining references
  const remainingReferencesCount = await dbMutator.artifactProcessReference.count({
    where: { artifactId: artifact.id },
  });

  const remainingVersionReferencesCount = await dbMutator.artifactVersionReference.count({
    where: { artifactId: artifact.id },
  });

  // If no remaining references, delete the artifact
  if (remainingReferencesCount === 0 && remainingVersionReferencesCount === 0) {
    const isDeleted = await deleteFile(artifact.filePath);
    if (isDeleted) {
      await removeArtifactFromDB(artifact.filePath, tx);
    }
    return isDeleted;
  }

  return true;
}

// Functionality for handling organization logo files
export async function saveOrganizationLogo(
  organizationId: string,
  fileName: string,
  mimeType: string,
  fileContent?: Buffer | Uint8Array,
) {
  const newFileName = getNewFileName(fileName);
  const filePath = `spaces/${organizationId}/${newFileName}`;

  const { presignedUrl, status } = await saveFile(filePath, mimeType, fileContent);

  if (!status) {
    await deleteFile(filePath);
    throw new Error('Failed to save organization logo');
  }

  await db.space.update({
    where: { id: organizationId },
    data: { spaceLogo: filePath },
  });

  return { presignedUrl, filePath };
}

export async function getOrganizationLogo(organizationId: string) {
  const result = await db.space.findUnique({
    where: { id: organizationId },
    select: { spaceLogo: true },
  });

  if (result?.spaceLogo) {
    return retrieveFile(result.spaceLogo);
  }

  return null;
}

export async function deleteOrganizationLogo(organizationId: string): Promise<boolean> {
  const result = await db.space.findUnique({
    where: { id: organizationId },
    select: { spaceLogo: true },
  });

  if (result?.spaceLogo) {
    const isDeleted = await deleteFile(result.spaceLogo);
    if (isDeleted) {
      await db.space.update({
        where: { id: organizationId },
        data: { spaceLogo: null },
      });
    }
    return isDeleted;
  }

  return false;
}

export async function updateFileDeletableStatus(
  //spaceId: string,
  //userId: string,
  filePath: string,
  status: boolean,
  processId: string,
) {
  // if (!userId) {
  //   throw new Error(user is undefined ${userId});
  // }

  // if (!fileName) {
  //   return;
  // }

  // const ability = await getAbilityForUser(userId, spaceId);
  //TODO ability check

  const artifact = await db.artifact.findUnique({
    where: { filePath },
  });

  if (!artifact) {
    throw new Error(`Artifact with fileName "${filePath}" not found.`);
  }

  if (!status) {
    // Add a new reference
    try {
      await db.artifactProcessReference.create({
        data: { artifactId: artifact.id, processId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.warn('ArtifactProcessReference already exists.');
      } else {
        throw error;
      }
    }
  } else {
    // Remove the reference
    await db.artifactProcessReference.deleteMany({
      where: {
        artifactId: artifact.id,
        processId,
      },
    });
  }
}

async function getArtifactReference(artifactId: string, processId: string) {
  const res = await db.artifactProcessReference.findUnique({
    where: {
      artifactId_processId: {
        artifactId,
        processId,
      },
    },
  });
  return res;
}

// Soft delete a user task and its associated artifacts
export async function softDeleteProcessUserTask(processId: string, userTaskFilename: string) {
  const res = await getProcessUserTaskJSON(processId, userTaskFilename);
  if (res) {
    const userTaskJson = JSON.parse(res);
    const referencedArtifactFilenames = findKey(userTaskJson, 'src');
    referencedArtifactFilenames.push(`${userTaskFilename}.json`);
    referencedArtifactFilenames.push(`${userTaskFilename}.html`);

    const artifacts = await asyncMap(referencedArtifactFilenames, (filename) =>
      getArtifactMetaData(filename, false),
    );

    for (const artifact of artifacts) {
      if (artifact) {
        await db.artifactProcessReference.deleteMany({
          where: {
            artifactId: artifact.id,
            processId,
          },
        });
      }
    }
  }
}

// Soft delete a user task and its associated artifacts
export async function softDeleteProcessScriptTask(processId: string, scriptTaskFileName: string) {
  const referencedArtifactFilenames = [
    `${scriptTaskFileName}.js`,
    `${scriptTaskFileName}.ts`,
    `${scriptTaskFileName}.xml`,
  ];

  const artifacts = await asyncMap(referencedArtifactFilenames, (filename) =>
    getArtifactMetaData(filename, false),
  );

  for (const artifact of artifacts) {
    if (artifact) {
      await db.artifactProcessReference.deleteMany({
        where: {
          artifactId: artifact.id,
          processId,
        },
      });
    }
  }
}

// Revert soft deletion of a user task and restore its artifacts
export async function revertSoftDeleteProcessUserTask(processId: string, userTaskFilename: string) {
  const res = await getProcessUserTaskJSON(processId, userTaskFilename);
  if (res) {
    const userTaskJson = JSON.parse(res);
    const referencedArtifactFilenames = findKey(userTaskJson, 'src');
    referencedArtifactFilenames.push(`${userTaskFilename}.json`);
    referencedArtifactFilenames.push(`${userTaskFilename}.html`);

    const artifacts = await asyncMap(referencedArtifactFilenames, (filename) =>
      getArtifactMetaData(filename, false),
    );

    for (const artifact of artifacts) {
      if (artifact) {
        await db.artifactProcessReference.create({
          data: {
            artifactId: artifact.id,
            processId,
          },
        });
      }
    }
  }
}

// Revert soft deletion of a user task and restore its artifacts
export async function revertSoftDeleteProcessScriptTask(
  processId: string,
  scriptTaskFileName: string,
) {
  const referencedArtifactFilenames = [
    `${scriptTaskFileName}.js`,
    `${scriptTaskFileName}.ts`,
    `${scriptTaskFileName}.xml`,
  ];

  const artifacts = await asyncMap(referencedArtifactFilenames, (filename) =>
    getArtifactMetaData(filename, false),
  );

  for (const artifact of artifacts) {
    if (artifact) {
      await db.artifactProcessReference.create({
        data: {
          artifactId: artifact.id,
          processId,
        },
      });
    }
  }
}

// Update artifact references for a versioned user task
// export async function updateArtifactRefVersionedUserTask(userTask: string, newFileName: string) {
//   if (!userTask) {
//     throw new Error('User task is undefined');
//   }

//   // const refIds: string[] = [];
//   // const userTaskJson = JSON.parse(userTask);
//   // const referencedArtifactFilenames = findKey(userTaskJson, 'src');

//   referencedArtifactFilenames.push(`${newFileName}.json`);

//   const artifacts = await asyncMap(referencedArtifactFilenames, (filename) =>
//     getArtifactMetaData(filename, false),
//   );

//   for (const artifact of artifacts) {
//     if (artifact) {
//       const res = await db.artifactVersionReference.create({
//         data: {
//           artifactId: artifact.id,
//         },
//       });
//       if (res) refIds.push(res.id);
//     }
//   }
//   return refIds;
// }
