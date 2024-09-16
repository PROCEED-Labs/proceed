'use server';

import { Storage } from '@google-cloud/storage';
import fse from 'fs-extra';
import path from 'path';
import envPaths from 'env-paths';
import { LRUCache } from 'lru-cache';
import { ContentTypeNotAllowed } from './content-upload-error';

// Constants
const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10 MB
const DEPLOYMENT_ENV = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV as 'cloud' | 'local';
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME || '';
const cache = new LRUCache<string, Buffer>({
  maxSize: 100,
  ttl: 60 * 60 * 1000, // 1 hour TTL
  sizeCalculation: () => 1,
});

const getLocalStorageBasePath = (): string => {
  let appDir = envPaths('proceed-management-system').config;
  appDir = appDir.slice(0, appDir.search('-nodejs'));
  return process.env.NODE_ENV === 'development' ? path.join(appDir, 'development') : appDir;
};

const LOCAL_STORAGE_BASE = getLocalStorageBasePath();
let storage: Storage | null = null;
let bucket: any = null;

if (DEPLOYMENT_ENV === 'cloud') {
  storage = new Storage({ keyFilename: process.env.GCP_KEY_PATH });
  bucket = storage.bucket(BUCKET_NAME);
}

// Helper functions
const setCors = async (bucket: any) => {
  await bucket.setCorsConfiguration([
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'PUT'],
      origin: ['*'], // Adjust trusted origin for production
      responseHeader: ['content-type', 'x-goog-content-length-range'],
    },
  ]);
};

const ensureBucketExists = () => {
  if (!bucket) throw new Error('Storage bucket not initialized');
};

const saveLocalFile = async (filePath: string, fileContent: Buffer) => {
  const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
  await fse.ensureDir(path.dirname(fullPath));
  await fse.writeFile(fullPath, fileContent);
  cache.set(filePath, fileContent);
};

// Core Functions
export const saveFile = async (
  filePath: string,
  mimeType: string,
  fileContent?: Buffer | Uint8Array | Blob | string,
): Promise<{ presignedUrl: string | null; status: boolean }> => {
  let presignedUrl: string | null = null;
  let status = false;

  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      ensureBucketExists();
      const file = bucket.file(filePath);
      [presignedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: mimeType,
        extensionHeaders: { 'x-goog-content-length-range': `0,${MAX_CONTENT_LENGTH}` },
      });
    } else {
      if (!fileContent) throw new Error('File is required to upload');
      const decodedContent = Buffer.from(fileContent as string, 'base64');
      await saveLocalFile(filePath, decodedContent);
    }
    status = true;
  } catch (error: any) {
    throw new Error(`Failed to save file: ${error.message}`);
  }

  return { presignedUrl, status };
};

export const retrieveFile = async (filePath: string): Promise<string | Buffer> => {
  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      ensureBucketExists();

      const file = bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });
      return url;
    } else {
      if (cache.has(filePath)) return cache.get(filePath)!;

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
};

export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      ensureBucketExists();

      const file = bucket.file(filePath);
      await file.delete();
    } else {
      const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
      if (await fse.pathExists(fullPath)) {
        await fse.unlink(fullPath);
        cache.delete(filePath);
      } else {
        throw new Error(`File does not exist at path ${fullPath}`);
      }
    }
    return true;
  } catch (error: any) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};
