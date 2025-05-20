import { useState, useCallback, use } from 'react';
import { useEnvironment } from '@/components/auth-can';
import {
  deleteEntityFile,
  retrieveEntityFile,
  saveEntityFile,
  updateFileDeletableStatus,
} from './data/file-manager-facade';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { message } from 'antd';
import { EnvVarsContext } from '@/components/env-vars-context';

const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB

interface UseFileManagerReturn {
  upload: (
    file: File | Blob,
    entityId: string,
    fileName?: string,
  ) => Promise<{ ok: boolean; fileName?: string }>;
  download: (
    entityId: string,
    fileName: string,
    shareToken?: string | null,
  ) => Promise<{ ok: boolean; fileUrl?: string }>;
  remove: (entityId: string, fileName: string) => Promise<boolean>;
  replace: (
    file: File | Blob,
    entityId: string,
    oldFileName: string,
    newFileName: string,
  ) => Promise<{ ok: boolean; fileName?: string }>;
  reset: () => void;
  isLoading: boolean;
  error: string | null;
  fileUrl: string | null;
}

export function useFileManager(entityType: EntityType): UseFileManagerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const { spaceId } = useEnvironment();
  const env = use(EnvVarsContext);
  const DEPLOYMENT_ENV = env.PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV;

  const performFileOperation = useCallback(
    async (
      operation: 'upload' | 'download',
      entityId: string,
      fileName: string,
      file?: Blob,
      shareToken?: string | null,
    ): Promise<{ ok: boolean; fileName?: string; fileUrl?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const result =
          operation === 'upload'
            ? await handleUpload(entityId, fileName, file!)
            : await handleDownload(entityId, fileName, shareToken);

        if ('error' in result) throw new Error(result.error);

        if (operation === 'download' && result.fileUrl) setFileUrl(result.fileUrl);

        return { ok: true, fileName: result.fileName, fileUrl: result.fileUrl };
      } catch (err: any) {
        message.error(err.message);
        setError(err.message || '| Blob operation failed');
        return { ok: false };
      } finally {
        setIsLoading(false);
      }
    },
    [spaceId],
  );

  const handleUpload = async (entityId: string, fileName: string, file: File | Blob) => {
    if (DEPLOYMENT_ENV === 'cloud') {
      const response = await saveEntityFile(entityType, entityId, file.type, fileName, undefined);
      if ('error' in response) {
        return { success: false, error: (response.error as Error).message };
      }
      if (!response.presignedUrl) {
        return { success: false, error: 'Failed to get presignedUrl' };
      }
      await uploadToCloud(file, response.presignedUrl);
      return { success: true, fileName: response.fileName };
    } else {
      return handleLocalOperation('PUT', entityId, fileName, file);
    }
  };

  const handleDownload = async (entityId: string, fileName: string, shareToken?: string | null) => {
    if (DEPLOYMENT_ENV === 'cloud') {
      const presignedUrl = (await retrieveEntityFile(entityType, entityId, fileName)) as string;
      //const fileResponse = await fetch(presignedUrl as string);
      // if (!fileResponse.ok) throw new Error('Download failed');

      // const blob = await fileResponse.blob();
      // const url = URL.createObjectURL(blob);
      return { success: true, fileUrl: presignedUrl };
    } else {
      return handleLocalOperation('GET', entityId, fileName, null, shareToken);
    }
  };

  const uploadToCloud = async (file: File | Blob, presignedUrl: string) => {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-goog-content-length-range': `0,${MAX_CONTENT_LENGTH}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed! Status: ${response.status}`);
    }
  };

  const handleLocalOperation = async (
    method: 'PUT' | 'GET',
    entityId: string,
    fileName: string,
    file?: File | Blob | null,
    shareToken?: string | null,
  ): Promise<{ success: boolean; fileUrl?: string; fileName?: string }> => {
    const url = `/api/private/file-manager?environmentId=${spaceId}&entityId=${entityId}&entityType=${entityType}&fileName=${fileName}&shareToken=${shareToken}`;

    const response = await fetch(url, {
      method,
      body: file ? file : undefined,
    });

    if (response.status === 200) {
      if (method === 'GET') {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        return { success: true, fileUrl: downloadUrl };
      } else {
        const savedFileName = await response.text();
        return { success: true, fileName: savedFileName };
      }
    } else {
      return { success: false };
    }
  };

  const upload = (file: File | Blob, entityId: string, fileName?: string) => {
    return performFileOperation(
      'upload',
      entityId,
      fileName || (file instanceof File ? file.name : ''),
      file,
    );
  };

  const download = (entityId: string, fileName: string, shareToken?: string | null) =>
    performFileOperation('download', entityId, fileName, undefined, shareToken);

  const remove = async (entityId: string, fileName: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      entityType === EntityType.PROCESS
        ? // ? await updateFileDeletableStatus(spaceId, data?.user.id!, fileName, true, entityId)
          await updateFileDeletableStatus(fileName, true, entityId)
        : await deleteEntityFile(entityType, entityId, fileName);
      return true;
    } catch (err: any) {
      setError(err.message || 'Delete failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const replace = async (
    file: File | Blob,
    entityId: string,
    oldFileName: string,
    newFileName: string,
  ): Promise<{ ok: boolean; fileName?: string }> => {
    try {
      setIsLoading(true);
      await remove(entityId, oldFileName);
      const result = await upload(file, entityId, newFileName);
      return result;
    } catch (err: any) {
      setError(err.message || 'Replace failed');
      return { ok: false };
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFileUrl(null);
    setError(null);
  };

  return { upload, download, remove, replace, reset, isLoading, error, fileUrl };
}
