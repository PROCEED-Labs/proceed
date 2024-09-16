import { useState, useCallback } from 'react';
import { useEnvironment } from '@/components/auth-can';
import { deleteEntityFile, retrieveEntityFile, saveEnityFile } from './data/file-manager-facade';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { message } from 'antd';

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
    newFileName?: string,
  ) => Promise<{ ok: boolean; fileName?: string }>;
  reset: () => void;
  isLoading: boolean;
  error: string | null;
  fileUrl: string | null;
}

const DEPLOYMENT_ENV = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV as 'cloud' | 'local';

export function useFileManager(entityType: EntityType): UseFileManagerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const { spaceId } = useEnvironment();

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
        setError(err.message || '| Blob operation failed');
        return { ok: false };
      } finally {
        setIsLoading(false);
      }
    },
    [spaceId],
  );

  const handleUpload = async (entityId: string, fileName: string, file: File | Blob) => {
    if (DEPLOYMENT_ENV === 'cloud') {
      const response = await saveEnityFile(entityType, entityId, file.type, fileName);
      if ('error' in response) {
        return { success: false, error: response.error.message };
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
      const presignedUrl = await retrieveEntityFile(entityType, entityId, fileName);
      const fileResponse = await fetch(presignedUrl as string);
      if (!fileResponse.ok) throw new Error('Download failed');

      const blob = await fileResponse.blob();
      const url = URL.createObjectURL(blob);
      return { success: true, fileUrl: url };
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
    const url = `${window.location.origin}/api/file-manager?environmentId=${spaceId}&entityId=${entityId}&entityType=${entityType}&fileName=${fileName}&shareToken=${shareToken}`;

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
    console.log(fileName);
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
      await deleteEntityFile(entityType, entityId, fileName);
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
    newFileName?: string,
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
