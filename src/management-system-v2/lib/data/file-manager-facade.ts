'use server';

import {
  getFileCategory,
  getNewFileName,
  hasUuidBeforeUnderscore,
  EntityType,
} from '../helpers/fileManagerHelpers';
import { deleteFile, retrieveFile, saveFile } from './file-manager';
import db from '@/lib/data';

//Extend this if needed
export async function saveEnityFile(
  entityType: EntityType,
  entityId: string,
  mimeType: string,
  fileName: string,
  fileContent?: Buffer | Uint8Array | Blob,
) {
  switch (entityType) {
    case EntityType.PROCESS:
      return saveProcessArtifact(entityId, mimeType, fileName, fileContent);
    case EntityType.ORGANIZATION:
      return saveOrganisationLogo(fileName, entityId, mimeType, fileContent);
    case EntityType.MACHINE:
    //TODO extend
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
    //TODO extend
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
      return deleteProcessArtifact(entityId, fileName!);
    case EntityType.ORGANIZATION:
      return deleteOrganisationLogo(entityId);
    case EntityType.MACHINE:
    //TODO extend
    default:
      return false;
  }
}
function getFilePathProcessArtifact(
  fileName: string,
  processId: string,
  mimeType?: string,
): string {
  const artifactType = getFileCategory(fileName, mimeType);
  return `processes/${processId}/${artifactType}/${fileName}`;
}

async function saveFilePathToDB(fileName: string, filePath: string, processId: string) {
  await db.processArtifacts.create({
    data: {
      fileName: fileName,
      filePath: filePath,
      processId: processId,
    },
  });
}

async function removeFilePathFromDB(filePath: string, processId: string) {
  await db.processArtifacts.delete({ where: { filePath: filePath, processId: processId } });
}

export async function updateFileDeletableStatus(fileName: string, status: boolean) {
  return await db.processArtifacts.update({
    where: { fileName: fileName },
    data: {
      deletable: status,
      deletedOn: new Date(),
    },
  });
}

export async function saveProcessArtifact(
  processId: string,
  mimeType: string,
  fileName: string,
  fileContent?: Buffer | Uint8Array | Blob,
) {
  const newFileName = !hasUuidBeforeUnderscore(fileName) ? getNewFileName(fileName) : fileName;
  const filePath = getFilePathProcessArtifact(newFileName, processId);

  const { presignedUrl, status } = await saveFile(filePath, mimeType, fileContent);
  if (status) {
    await saveFilePathToDB(newFileName, filePath, processId);
  }

  return { presignedUrl: presignedUrl, fileName: newFileName };
}

export async function retrieveProcessArtifact(
  processId: string,
  fileNameOrPath: string,
  isFilePath = false,
) {
  const filePath = isFilePath
    ? fileNameOrPath
    : getFilePathProcessArtifact(fileNameOrPath, processId);

  const res = await retrieveFile(filePath);

  return res;
}

export async function deleteProcessArtifact(
  processId: string,
  fileNameOrPath: string,
  isFilePath = false,
) {
  const filePath = isFilePath
    ? fileNameOrPath
    : getFilePathProcessArtifact(fileNameOrPath, processId);
  const res = await deleteFile(filePath);
  if (res) {
    await removeFilePathFromDB(filePath, processId);
  }
  return res;
}

export async function saveOrganisationLogo(
  fileName: string,
  organisationId: string,
  mimeType: string,
  fileContent?: Buffer | Uint8Array | Blob,
) {
  const newFileName = getNewFileName(fileName);
  const filePath = `spaces/${organisationId}/logo/${newFileName}`;

  const { presignedUrl, status } = await saveFile(filePath, mimeType, fileContent);

  if (status) {
    await db.space.update({ where: { id: organisationId }, data: { logo: filePath } });
  }

  return { presignedUrl: presignedUrl, fileName: newFileName };
}

export async function getOrganisationLogo(organisationId: string) {
  const result = await db.space.findUnique({
    where: { id: organisationId },
    select: { logo: true },
  });
  if (result?.logo) {
    const res = await retrieveFile(result.logo);
    return res;
  }

  return null;
}

export async function deleteOrganisationLogo(organisationId: string): Promise<boolean> {
  const logoPath = await db.space.findUnique({
    where: { id: organisationId },
    select: { logo: true },
  });
  if (logoPath?.logo) {
    const res = await deleteFile(logoPath.logo);
    if (res) await db.space.update({ where: { id: organisationId }, data: { logo: null } });
    return res;
  }
  return false;
}
