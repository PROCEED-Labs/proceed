'use server';
import { Storage } from '@google-cloud/storage';
import fse from 'fs-extra';
import path from 'path';
import envPaths from 'env-paths';
import { LRUCache } from 'lru-cache';

//TODO: extend it if necessary
type ArtifactType = 'image' | 'html' | 'script' | 'pdf';

const cache = new LRUCache<string, Buffer>({
  maxSize: 100,
  ttl: 60 * 60 * 1000,
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

const LOCAL_STORAGE_BASE = path.join(getLocalStorageBasePath(), 'storage');

let bucket: any;
let storage: any;

if (DEPLOYMENT_ENV === 'cloud') {
  storage = new Storage({ keyFilename: process.env.GCP_KEY_PATH });
  bucket = storage.bucket(BUCKET_NAME);
}

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

export async function saveFile(
  spaceId: string,
  userId: string,
  artifactType: ArtifactType,
  fileName: string,
  fileContent: Buffer,
  processId?: string,
): Promise<void> {
  const filePath = getFilePath(spaceId, userId, artifactType, fileName, processId);

  if (cache.has(filePath)) {
    cache.delete(filePath)!;
  }

  if (DEPLOYMENT_ENV === 'cloud') {
    const file = bucket.file(filePath);
    await file.save(fileContent);
  } else {
    const fullPath = path.join(LOCAL_STORAGE_BASE, filePath);
    await fse.ensureDir(path.dirname(fullPath));
    await fse.writeFile(fullPath, fileContent);
  }
}

export async function retrieveFile(
  spaceId: string,
  userId: string,
  artifactType: ArtifactType,
  fileName: string,
  processId?: string,
): Promise<Buffer> {
  const filePath = getFilePath(spaceId, userId, artifactType, fileName, processId);

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
