'use server';

import { Storage } from '@google-cloud/storage';
import fse from 'fs-extra';
import path from 'path';
import envPaths from 'env-paths';
import { LRUCache } from 'lru-cache';
import {
  getFilePath,
  getNewFileName,
  hasUuidBeforeUnderscore,
  removeFilePathFromDB,
  saveFilePathToDB,
} from '../helpers/fileManagerHelpers';
import { checkIfProcessExists } from './legacy/_process';

// In-memory LRU cache setup
const cache = new LRUCache<string, Buffer>({
  maxSize: 100,
  ttl: 60 * 60 * 1000, // Time-to-live in milliseconds
  sizeCalculation: (value, key) => {
    return 1;
  },
});

const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10 MB

const DEPLOYMENT_ENV = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV as 'cloud' | 'local';
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

const setCors = async (bucket: any) => {
  bucket.setCorsConfiguration([
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'PUT'],
      origin: ['*'], // TODO: adjust trusted origin list
      responseHeader: ['content-type', 'x-goog-content-length-range'],
    },
  ]);
};

if (DEPLOYMENT_ENV === 'cloud') {
  storage = new Storage({ keyFilename: process.env.GCP_KEY_PATH });
  bucket = storage.bucket(BUCKET_NAME);
  setCors(bucket);
}

export async function saveFile(
  fileName: string,
  mimeType: string,
  processId: string,
  fileContent?: Buffer | Uint8Array | Blob | string,
): Promise<{ presignedUrl: string | null; fileName: string }> {
  const newFileName = !hasUuidBeforeUnderscore(fileName) ? getNewFileName(fileName) : fileName;
  const filePath = mimeType
    ? getFilePath(newFileName, processId, mimeType)
    : getFilePath(newFileName, processId);
  try {
    let presignedUrl = null;
    if (DEPLOYMENT_ENV === 'cloud') {
      await checkIfProcessExists(processId);

      const file = bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: `${mimeType}`,
        extensionHeaders: {
          'x-goog-content-length-range': `${0},${MAX_CONTENT_LENGTH}`,
        },
      });

      presignedUrl = url;
    } else {
      if (!fileContent) {
        throw new Error('File is required to upload');
      }
      const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
      await fse.ensureDir(path.dirname(fullPath));
      const decodedContent = Buffer.from(fileContent as string, 'base64');
      await fse.writeFile(fullPath, decodedContent);

      if (cache.has(filePath)) cache.delete(filePath);
    }

    await saveFilePathToDB(filePath, processId);

    return { presignedUrl, fileName: newFileName };
  } catch (error: any) {
    throw new Error(`Failed to save file: ${error.message}`);
  }
}

export async function retrieveFile(
  fileNameOrPath: string,
  processId: string,
  isFilePath: boolean = false,
): Promise<Buffer | string> {
  const filePath = isFilePath ? fileNameOrPath : getFilePath(fileNameOrPath, processId);

  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      await checkIfProcessExists(processId);
      const file = bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });
      return url;
    } else {
      if (cache.has(filePath)) {
        const fileContent = cache.get(filePath);
        console.log('Cache Hit');
        return fileContent!;
      }
      const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
      if (await fse.pathExists(fullPath)) {
        const fileContent = await fse.readFile(fullPath);
        cache.set(filePath, fileContent);
        return fileContent;
      } else {
        throw new Error(`File does not exist at path ${fullPath}`);
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to retrieve file: ${error.message}`);
  }
}
export async function deleteFile(
  fileNameOrPath: string,
  processId: string,
  isFilePath: boolean = false,
): Promise<boolean> {
  const filePath = isFilePath ? fileNameOrPath : getFilePath(fileNameOrPath, processId);

  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      const file = bucket.file(filePath);
      await file.delete();
    } else {
      const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
      if (await fse.pathExists(fullPath)) {
        await fse.unlink(fullPath);
        if (cache.has(filePath)) cache.delete(filePath);
      } else {
        throw new Error(`File does not exist at path ${fullPath}`);
      }
    }

    await removeFilePathFromDB(filePath, processId);
    return true;
  } catch (error: any) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
