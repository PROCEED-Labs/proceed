import { v4 } from 'uuid';

export type ArtifactType = 'images' | 'user-tasks' | 'script-tasks' | 'bpmns' | 'others';

export enum EntityType {
  PROCESS = 'PROCESS',
  ORGANIZATION = 'ORGANISATION',
  MACHINE = 'MACHINE',
  USERTASK = 'USER-TASK',
}

const FILE_EXTENSION_CATEGORIES: Record<string, ArtifactType> = {
  jpg: 'images',
  jpeg: 'images',
  png: 'images',
  gif: 'images',
  svg: 'images',
  bmp: 'images',
  webp: 'images',
  html: 'user-tasks',
  htm: 'user-tasks',
  pdf: 'others',
  js: 'script-tasks',
  bpmn: 'bpmns',
};

const MIME_TYPE_CATEGORIES: Record<string, ArtifactType> = {
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/svg+xml': 'images',
  'image/bmp': 'images',
  'image/webp': 'images',
  'text/html': 'user-tasks',
  'application/pdf': 'others',
  'application/xml': 'bpmns',
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

  return 'others';
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
