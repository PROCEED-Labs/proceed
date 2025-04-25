'use server';

import { Storage } from '@google-cloud/storage';
import fse from 'fs-extra';
import path from 'path';
import envPaths from 'env-paths';
import { LRUCache } from 'lru-cache';
import { env } from '@/lib/env-vars';

// Constants
const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10 MB
const DEPLOYMENT_ENV = env.PROCEED_PUBLIC_DEPLOYMENT_ENV as 'cloud' | 'local';
const BUCKET_NAME = env.GOOGLE_CLOUD_BUCKET_NAME || '';
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
  storage = new Storage({ keyFilename: process.env.PROCEED_GCP_BUCKET_KEY_PATH });
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
  usePresignedUrl: boolean = true,
): Promise<{ presignedUrl: string | null; status: boolean }> => {
  let presignedUrl: string | null = null;
  let status = false;

  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      ensureBucketExists();
      const file = bucket.file(filePath);

      if (usePresignedUrl) {
        // Generate a presigned URL for file upload
        [presignedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          contentType: mimeType,
          extensionHeaders: { 'x-goog-content-length-range': `0,${MAX_CONTENT_LENGTH}` },
        });
      } else {
        // Directly upload file content to the GCP bucket
        if (!fileContent) throw new Error('File content is required to upload');
        const contentToUpload =
          typeof fileContent === 'string' ? Buffer.from(fileContent, 'base64') : fileContent;
        await file.save(contentToUpload, {
          metadata: { contentType: mimeType },
          resumable: false,
        });
      }
    } else {
      // Handle local file saving (local deployment)
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

export const retrieveFile = async (
  filePath: string,
  usePresignedUrl: boolean = true,
): Promise<string | Buffer> => {
  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      ensureBucketExists();

      const file = bucket.file(filePath);
      if (usePresignedUrl) {
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
        return url;
      } else {
        const [fileContent] = await file.download();
        return fileContent;
      }
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

interface CopyFileOptions {
  newFilename?: string;
}

export const copyFile = async (
  sourceFilePath: string,
  destinationFilePath: string,
  options?: CopyFileOptions,
): Promise<{ status: boolean; newFilename: string; newFilepath: string }> => {
  let status = false;
  const finalFileName = options?.newFilename || path.basename(destinationFilePath);
  const finalDestinationPath = path.join(path.dirname(destinationFilePath), finalFileName);

  try {
    if (DEPLOYMENT_ENV === 'cloud') {
      // Handle GCP bucket file copying
      ensureBucketExists();

      const sourceFile = bucket.file(sourceFilePath);
      const destinationFile = bucket.file(finalDestinationPath);
      await sourceFile.copy(destinationFile);
    } else {
      // Handle local file copying
      const fullSourcePath = path.join(LOCAL_STORAGE_BASE, sourceFilePath);
      const fullDestinationPath = path.join(LOCAL_STORAGE_BASE, finalDestinationPath);

      if (await fse.pathExists(fullSourcePath)) {
        await fse.ensureDir(path.dirname(fullDestinationPath));
        await fse.copy(fullSourcePath, fullDestinationPath);
        cache.set(finalDestinationPath, await fse.readFile(fullDestinationPath));
      } else {
        throw new Error(`Source file does not exist at path ${fullSourcePath}`);
      }
    }

    status = true;
  } catch (error: any) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }

  return { status, newFilename: finalFileName, newFilepath: finalDestinationPath };
};
