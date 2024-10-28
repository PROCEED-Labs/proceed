'use server';

import { Prisma } from '@prisma/client';
import {
  getFileCategory,
  getNewFileName,
  EntityType,
  ArtifactType,
} from '../helpers/fileManagerHelpers';
import { contentTypeNotAllowed } from './content-upload-error';
import { deleteFile, retrieveFile, saveFile } from './file-manager/file-manager';
import db from '@/lib/data/db';
import { getProcessUserTaskJSON } from './db/process';
import { asyncMap, findKey } from '../helpers/javascriptHelpers';

// Allowed content types for files
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'text/html',
  'application/pdf',
];

const isContentTypeAllowed = (mimeType: string) => {
  return ALLOWED_CONTENT_TYPES.includes(mimeType);
};

const saveArtifactToDB = async (
  fileName: string,
  filePath: string,
  processId: string,
  artifactType: ArtifactType,
) => {
  return db.artifact.create({
    data: {
      fileName,
      filePath,
      artifactType,
      references: { create: { processId: processId } },
    },
  });
};

const removeArtifactFromDB = async (filePath: string) => {
  return db.artifact.delete({
    where: { filePath },
  });
};

// Utility to handle file paths for process artifacts
const generateProcessFilePath = (
  fileName: string,
  processId: string,
  mimeType?: string,
): string => {
  const artifactType = getFileCategory(fileName, mimeType);

  if (artifactType === 'images' || artifactType === 'others') {
    return `artifacts/${artifactType}/${fileName}`;
  }

  if (artifactType === 'bpmns') {
    return `processes/${processId}/${fileName}`;
  }
  // user-tasks,scripts
  return `processes/${processId}/${artifactType}/${fileName}`;
};

export async function getArtifactMetaData(fileNameOrPath: string, isFilePath: boolean) {
  return await db.artifact.findUnique({
    where: isFilePath ? { filePath: fileNameOrPath } : { fileName: fileNameOrPath },
  });
}

export async function saveEnityFile(
  entityType: EntityType,
  entityId: string,
  mimeType: string,
  fileName: string,
  fileContent?: Buffer | Uint8Array | Blob,
) {
  if (!isContentTypeAllowed(mimeType)) {
    return contentTypeNotAllowed(`Content type '${mimeType}' is not allowed`);
  }

  switch (entityType) {
    case EntityType.PROCESS:
      return saveProcessArtifact(entityId, fileName, mimeType, fileContent);
    case EntityType.ORGANIZATION:
      return saveOrganisationLogo(fileName, entityId, mimeType, fileContent);
    case EntityType.MACHINE:
    // Extend for other entity types
    default:
      return { presignedUrl: null, fileName: null };
  }
}

export async function retrieveEntityFile(
  entityType: EntityType,
  entityId: string,
  fileName?: string | null,
) {
  switch (entityType) {
    case EntityType.PROCESS:
      return retrieveProcessArtifact(entityId, fileName!);
    case EntityType.ORGANIZATION:
      return getOrganisationLogo(entityId);
    case EntityType.MACHINE:
    // Extend for other entity types
    default:
      return null;
  }
}

export async function deleteEntityFile(
  entityType: EntityType,
  entityId: string,
  fileName?: string,
): Promise<boolean> {
  switch (entityType) {
    case EntityType.PROCESS:
      return deleteProcessArtifact(fileName!);
    case EntityType.ORGANIZATION:
      return deleteOrganisationLogo(entityId);
    case EntityType.MACHINE:
    // Extend for other entity types
    default:
      return false;
  }
}

// Functionality for handling process artifact files
export async function saveProcessArtifact(
  processId: string,
  fileName: string,
  mimeType: string,
  fileContent?: Buffer | Uint8Array | Blob,
  generateNewFileNameFlag: boolean = true,
) {
  const newFileName = generateNewFileNameFlag ? getNewFileName(fileName) : fileName;
  const artifactType = getFileCategory(fileName);
  const filePath = generateProcessFilePath(newFileName, processId, mimeType);

  const usePresignedUrl = ['images', 'others'].includes(artifactType);

  const { presignedUrl, status } = await saveFile(filePath, mimeType, fileContent, usePresignedUrl);
  if (status) {
    await saveArtifactToDB(newFileName, filePath, processId, artifactType);
  } else {
    await deleteFile(filePath);
    return { presignedUrl: null, fileName: null };
  }

  return { presignedUrl, fileName: newFileName };
}

export async function replaceProcessArtifact(
  filePath: string,
  fileName: string,
  mimeType: string,
  fileContent?: Buffer | Uint8Array | Blob,
) {
  const newFileName = getNewFileName(fileName);
  const artifactType = getFileCategory(fileName);

  const usePresignedUrl = ['images', 'others'].includes(artifactType);

  const { presignedUrl, status } = await saveFile(filePath, mimeType, fileContent, usePresignedUrl);

  return { presignedUrl, fileName: newFileName };
}

export async function retrieveProcessArtifact(
  processId: string,
  fileNameOrPath: string,
  isFilePath = false,
  usePresignedUrl: boolean = true,
) {
  const filePath = isFilePath ? fileNameOrPath : generateProcessFilePath(fileNameOrPath, processId);
  return retrieveFile(filePath, usePresignedUrl);
}

export async function deleteProcessArtifact(fileNameOrPath: string, isFilePath = false) {
  const artifact = await getArtifactMetaData(fileNameOrPath, isFilePath);
  if (!artifact) {
    throw new Error(`${fileNameOrPath} not found`);
  }

  if (artifact.refCounter == 0) {
    const isDeleted = await deleteFile(artifact.filePath);
    if (isDeleted) {
      await removeArtifactFromDB(artifact.filePath);
    }
    return isDeleted;
  } else {
    await db.artifactReference.deleteMany({
      where: {
        OR: [{ artifactId: artifact.id }],
      },
    });

    return true;
  }
}

// Functionality for handling organization logo files

export async function saveOrganisationLogo(
  fileName: string,
  organisationId: string,
  mimeType: string,
  fileContent?: Buffer | Uint8Array | Blob,
) {
  const newFileName = getNewFileName(fileName);
  const filePath = `artifacts/images/${newFileName}`;

  const { presignedUrl, status } = await saveFile(filePath, mimeType, fileContent);

  if (status) {
    await db.space.update({
      where: { id: organisationId },
      data: { logo: filePath },
    });
  }

  return { presignedUrl, fileName: newFileName };
}

export async function getOrganisationLogo(organisationId: string) {
  const result = await db.space.findUnique({
    where: { id: organisationId },
    select: { logo: true },
  });

  if (result?.logo) {
    return retrieveFile(result.logo);
  }

  return null;
}

export async function deleteOrganisationLogo(organisationId: string): Promise<boolean> {
  const result = await db.space.findUnique({
    where: { id: organisationId },
    select: { logo: true },
  });

  if (result?.logo) {
    const isDeleted = await deleteFile(result.logo);
    if (isDeleted) {
      await db.space.update({
        where: { id: organisationId },
        data: { logo: null },
      });
    }
    return isDeleted;
  }

  return false;
}

export async function updateFileDeletableStatus(
  //spaceId: string,
  //userId: string,
  fileName: string,
  status: boolean,
  processId: string,
) {
  // if (!userId) {
  //   throw new Error(`user is undefined ${userId}`);
  // }

  // if (!fileName) {
  //   return;
  // }

  // const ability = await getAbilityForUser(userId, spaceId);
  //TODO ability check

  return await updateFileRefCounter(fileName, status, processId);
}

async function getArtifactReference(artifactId: string, processId: string) {
  const res = await db.artifactReference.findUnique({
    where: {
      artifactId_processId: {
        artifactId,
        processId,
      },
    },
  });
  return res;
}

// Update file status in the database
export async function updateFileRefCounter(fileName: string, status: boolean, processId: string) {
  const artifact = await db.artifact.findUnique({
    where: { fileName },
  });

  if (!artifact) {
    throw new Error(`ProcessArtifact with fileName "${fileName}" not found.`);
  }

  if (!status) {
    if (await getArtifactReference(artifact.id, processId)) {
      return;
    }
    try {
      await db.artifactReference.create({
        data: { artifactId: artifact.id, processId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('ArtifactReference already exists.');
      }
      throw error;
    }
  } else {
    await db.artifactReference.deleteMany({
      where: {
        artifactId: artifact.id,
      },
    });
  }

  // refCounter handled by db triggers
}

export async function softDeleteProcessUserTask(processId: string, userTaskFilename: string) {
  const res = await getProcessUserTaskJSON(processId, userTaskFilename);
  if (res) {
    const userTaskJson = JSON.parse(res);
    const referencedArtifactFilenames = findKey(userTaskJson, 'src');
    referencedArtifactFilenames.push(`${userTaskFilename}.json`);
    const artifacts = await asyncMap(referencedArtifactFilenames, (filename) =>
      getArtifactMetaData(filename, false),
    );

    const references = await asyncMap(artifacts, (artifact) =>
      getArtifactReference(artifact!.id, processId),
    );

    for (const ref of references) {
      await db.artifactReference.delete({ where: { id: ref?.id } });
    }
  }
}

export async function revertSoftDeleteProcessUserTask(processId: string, userTaskFilename: string) {
  const res = await getProcessUserTaskJSON(processId, userTaskFilename);
  if (res) {
    const userTaskJson = JSON.parse(res);
    const referencedArtifactFilenames = findKey(userTaskJson, 'src');
    referencedArtifactFilenames.push(`${userTaskFilename}.json`);
    const artifacts = await asyncMap(referencedArtifactFilenames, (filename) =>
      getArtifactMetaData(filename, false),
    );

    for (const artifact of artifacts) {
      await db.artifactReference.create({
        data: {
          artifactId: artifact!.id,
          processId: processId,
        },
      });
    }
  }
}
