import db from '@/lib/data';
import { v4 } from 'uuid';

export type ArtifactType = 'image' | 'html' | 'pdf' | 'script' | 'bpmn' | 'other';

const FILE_EXTENSION_CATEGORIES: Record<string, ArtifactType> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  bmp: 'image',
  webp: 'image',
  html: 'html',
  htm: 'html',
  pdf: 'pdf',
  js: 'script',
  bpmn: 'bpmn',
};

const MIME_TYPE_CATEGORIES: Record<string, ArtifactType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/webp': 'image',
  'text/html': 'html',
  'application/pdf': 'pdf',
  'application/xml': 'bpmn',
};

export function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

export function getFileCategory(fileName: string, mimeType?: string): ArtifactType {
  const extension = getFileExtension(fileName);

  if (mimeType && MIME_TYPE_CATEGORIES[mimeType]) {
    return MIME_TYPE_CATEGORIES[mimeType];
  }

  if (FILE_EXTENSION_CATEGORIES[extension]) {
    return FILE_EXTENSION_CATEGORIES[extension];
  }

  return 'other';
}

export function getFilePath(fileName: string, processId: string, mimeType?: string): string {
  const artifactType = getFileCategory(fileName, mimeType);
  return `processes/${processId}/${artifactType}/${fileName}`;
}

export function getNewFileName(fileName: string): string {
  return `${v4()}_${fileName}`;
}

export function hasUuidBeforeUnderscore(filename: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_.+/i;
  const res = uuidPattern.test(filename);
  return res;
}

export async function saveFilePathToDB(filePath: string, processId: string) {
  await db.processArtifacts.create({
    data: {
      filePath: filePath,
      processId: processId,
    },
  });
}

export async function checkIfFilePathExistsInDB(filePath: string, processId: string) {
  const res = await db.processArtifacts.findUnique({
    where: {
      filePath: filePath,
      processId: processId,
    },
  });
  return res ? true : false;
}

export async function removeFilePathFromDB(filePath: string, processId: string) {
  await db.processArtifacts.delete({ where: { filePath: filePath, processId: processId } });
}

export async function getAllProcessArtifactsFilePath(processId: string) {
  return await db.processArtifacts.findMany({ where: { processId: processId } });
}
