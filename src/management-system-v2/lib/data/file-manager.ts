'use server';

import { Storage } from '@google-cloud/storage';
import fse from 'fs-extra';
import path from 'path';
import envPaths from 'env-paths';
import { LRUCache } from 'lru-cache';

type ArtifactType = 'image' | 'html' | 'script' | 'pdf';

// In-memory LRU cache setup
const cache = new LRUCache<string, Buffer>({
  maxSize: 100,
  ttl: 60 * 60 * 1000, // Time-to-live in milliseconds
  sizeCalculation: (value, key) => {
    return 1;
  },
});

const DEPLOYMENT_ENV = process.env.DEPLOYMENT_ENV as 'cloud' | 'local';
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME || '';

function getLocalStorageBasePath(): string {
  let appDir: string;
  appDir = envPaths('proceed-management-system').config;
  appDir = appDir.slice(0, appDir.search('-nodejs'));
  if (process.env.NODE_ENV === 'development') {
    appDir = path.join(appDir, 'development');
  }
  return appDir;
}

// Base directory for local file storage
const LOCAL_STORAGE_BASE = path.join(getLocalStorageBasePath(), 'storage');

let bucket: any;
let storage: any;

if (DEPLOYMENT_ENV === 'cloud') {
  storage = new Storage({ keyFilename: process.env.GCP_KEY_PATH });
  bucket = storage.bucket(BUCKET_NAME);
}

/**
 * Constructs the file path based on the provided parameters.
 * @param spaceId - The space identifier.
 * @param userId - The user identifier.
 * @param artifactType - The type of artifact ('image', 'html', 'script', 'pdf').
 * @param fileName - The name of the file.
 * @param processId - Optional process identifier.
 * @returns The constructed file path.
 */
function getFilePath(
  spaceId: string,
  userId: string,
  artifactType: ArtifactType,
  fileName: string,
  processId?: string,
): string {
  return !processId
    ? `spaces/${spaceId}/user/${userId}/artifacts/${artifactType}/${fileName}`
    : `spaces/${spaceId}/user/${userId}/processes/${processId}/artifacts/${artifactType}/${fileName}`;
}

/**
 * Saves a file to either cloud storage or local storage.
 * @param spaceId - The space identifier.
 * @param userId - The user identifier.
 * @param artifactType - The type of artifact.
 * @param fileName - The name of the file.
 * @param fileContent - The content of the file as a Buffer.
 * @param processId - Optional process identifier.
 * @returns A promise that resolves when the file has been saved.
 */
export async function saveFile(
  spaceId: string,
  userId: string,
  artifactType: ArtifactType,
  fileName: string,
  fileContent: Buffer,
  processId?: string,
): Promise<void> {
  const filePath = getFilePath(spaceId, userId, artifactType, fileName, processId);

  if (DEPLOYMENT_ENV === 'cloud') {
    const file = bucket.file(filePath);
    await file.save(fileContent);
  } else {
    const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
    await fse.ensureDir(path.dirname(fullPath));
    await fse.writeFile(fullPath, fileContent);
  }

  if (cache.has(filePath)) {
    cache.delete(filePath)!;
  }
}

/**
 * Retrieves a file from either cloud storage or local storage.
 * @param spaceId - The space identifier.
 * @param userId - The user identifier.
 * @param artifactType - The type of artifact.
 * @param fileName - The name of the file.
 * @param processId - Optional process identifier.
 * @returns A promise that resolves with the file content as a Buffer.
 * @throws An error if the file does not exist.
 */
export async function retrieveFile(
  spaceId: string,
  userId: string,
  artifactType: ArtifactType,
  fileName: string,
  processId?: string,
): Promise<Buffer> {
  const filePath = getFilePath(spaceId, userId, artifactType, fileName, processId);

  // Check cache first
  if (cache.has(filePath)) {
    console.log('Cache hit: ', filePath);
    return cache.get(filePath)!;
  }

  let fileContent: Buffer;

  if (DEPLOYMENT_ENV === 'cloud') {
    const file = bucket.file(filePath);
    [fileContent] = await file.download();
  } else {
    const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
    if (await fse.pathExists(fullPath)) {
      fileContent = await fse.readFile(fullPath);
    } else {
      throw new Error(`File ${fileName} does not exist at path ${fullPath}`);
    }
  }

  cache.set(filePath, fileContent);

  return fileContent;
}

/**
 * Lists files of a specific artifact type for a given user and process.
 * @param spaceId - The space identifier.
 * @param userId - The user identifier.
 * @param processId - The process identifier.
 * @param artifactType - The type of artifact.
 * @returns A promise that resolves with an array of file names.
 */
export async function listFiles(
  spaceId: string,
  userId: string,
  processId: string,
  artifactType: ArtifactType,
): Promise<string[]> {
  const dirPath = getFilePath(spaceId, userId, artifactType, '', processId);

  if (DEPLOYMENT_ENV === 'cloud') {
    const [files] = await bucket.getFiles({ prefix: dirPath });
    return files.map((file: { name: string }) => path.basename(file.name));
  } else {
    const fullPath = path.join(LOCAL_STORAGE_BASE, dirPath);
    if (await fse.pathExists(fullPath)) {
      return fse.readdir(fullPath);
    } else {
      return [];
    }
  }
}

/**
 * Deletes a file from either cloud storage or local storage.
 * @param spaceId - The space identifier.
 * @param userId - The user identifier.
 * @param artifactType - The type of artifact.
 * @param fileName - The name of the file.
 * @param processId - Optional process identifier.
 * @returns A promise that resolves when the file has been deleted.
 * @throws An error if the file does not exist.
 */
export async function deleteFile(
  spaceId: string,
  userId: string,
  artifactType: ArtifactType,
  fileName: string,
  processId?: string,
): Promise<void> {
  const filePath = getFilePath(spaceId, userId, artifactType, fileName, processId);

  if (DEPLOYMENT_ENV === 'cloud') {
    const file = bucket.file(filePath);
    await file.delete();
  } else {
    const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
    if (await fse.pathExists(fullPath)) {
      await fse.unlink(fullPath);
    } else {
      throw new Error(`File ${fileName} does not exist at path ${fullPath}`);
    }
  }

  if (cache.has(filePath)) {
    cache.delete(filePath)!;
  }
}
