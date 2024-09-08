import { useState, useCallback } from 'react';
import { useEnvironment } from '@/components/auth-can';
import { deleteEntityFile, retrieveEntityFile, saveEnityFile } from './data/file-manager-facade';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';

type FileOperation = 'upload' | 'download';
type DeploymentEnv = 'cloud' | 'local';

const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB

interface FileManagerResult {
  success: boolean;
  url?: string;
  data?: Blob;
  error?: string;
  fileName?: string;
}

interface UseFileManagerReturn {
  upload: (
    file: File | Blob,
    entityId: string,
    fileName?: string,
  ) => Promise<{ ok: boolean; fileName: string }>;
  download: (
    entityId: string,
    fileName: string,
    shareToken?: string | null,
  ) => Promise<{ ok: boolean; fileUrl?: string }>;
  remove: (entityId: string, fileName: string) => Promise<boolean>;
  reset: () => void;
  isLoading: boolean;
  error: string | null;
  fileUrl: string | null;
}

const DEPLOYMENT_ENV = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV as DeploymentEnv;

export function useFileManager(entityType: EntityType): UseFileManagerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const { spaceId } = useEnvironment();

  const generateFileName = (file: File | Blob): string => {
    const timestamp = new Date().getTime();
    const extension = file instanceof File ? file.name.split('.').pop() : 'blob';
    return `file_${timestamp}.${extension}`;
  };

  const handleCloudUpload = async (file: File | Blob, presignedUrl: string): Promise<Response> => {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-goog-content-length-range': `${0},${MAX_CONTENT_LENGTH}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }
    return response;
  };

  const handleLocalOperation = async (
    method: 'PUT' | 'GET',
    spaceId: string,
    entityId: string,
    fileName: string,
    shareToken?: string | null,
    file?: File | Blob | null,
  ): Promise<Response> => {
    const url = `${window.location.origin}/api/file-manager?environmentId=${spaceId}&entityId=${entityId}&entityType=${entityType}&fileName=${fileName}&shareToken=${shareToken}`;
    return fetch(url, { method, body: file });
  };

  const handleFileOperation = useCallback(
    async (
      operation: FileOperation,
      file: File | Blob | null,
      fileName: string,
      entityId: string,
      shareToken?: string | null,
    ): Promise<FileManagerResult> => {
      try {
        if (operation === 'upload') {
          if (DEPLOYMENT_ENV === 'cloud') {
            const { presignedUrl, fileName: newFileName } = await saveEnityFile(
              entityType,
              entityId,
              file!.type,
              fileName,
            );
            if (presignedUrl! && typeof presignedUrl === 'string') {
              const uploadResponse = await handleCloudUpload(file!, presignedUrl);
              return { success: true, url: uploadResponse.url, fileName: newFileName };
            }
          } else {
            const response = await handleLocalOperation(
              'PUT',
              spaceId,
              entityId,
              fileName,
              shareToken,
              file!,
            );
            return { success: response.status === 200, fileName: await response.text() };
          }
        } else if (operation === 'download') {
          if (DEPLOYMENT_ENV === 'cloud') {
            const presignedGETUrl = await retrieveEntityFile(entityType, entityId, fileName);
            const fileResponse = await fetch(presignedGETUrl as string);
            if (!fileResponse.ok) {
              throw new Error(`Download failed! status: ${fileResponse.status}`);
            }
            const blob = await fileResponse.blob();
            const downloadUrl = URL.createObjectURL(blob);
            return { success: true, data: blob, url: downloadUrl };
          } else {
            const response = await handleLocalOperation(
              'GET',
              spaceId,
              entityId,
              fileName,
              shareToken,
            );
            if (response.status === 200) {
              const blob = await response.blob();
              const downloadUrl = URL.createObjectURL(blob);
              return { success: true, data: blob, url: downloadUrl };
            }
            return { success: false };
          }
        }
        throw new Error('Invalid operation');
      } catch (error) {
        console.error('File operation failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        };
      }
    },
    [spaceId],
  );

  const performOperation = useCallback(
    async (
      operation: FileOperation,
      entityId: string,
      fileName: string,
      shareToken?: string | null,
      file?: File | Blob,
    ): Promise<{ ok: boolean; fileName?: string; fileUrl?: string }> => {
      // Updated return type
      setIsLoading(true);
      setError(null);

      try {
        const result = await handleFileOperation(
          operation,
          file || null,
          fileName,
          entityId,
          shareToken,
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        if (operation === 'download' && result.url) {
          setFileUrl(result.url);
        }
        return { ok: true, fileName: result.fileName, fileUrl: result.url };
      } catch (err) {
        setError(err instanceof Error ? err.message : `${operation} failed`);
        return { ok: false };
      } finally {
        setIsLoading(false);
      }
    },
    [handleFileOperation],
  );

  const upload = useCallback(
    async (
      file: File | Blob,
      entityId: string,
      fileName?: string,
    ): Promise<{ ok: boolean; fileName: string }> => {
      const actualFileName =
        fileName || (file instanceof File ? file.name : generateFileName(file));
      const result = await performOperation('upload', entityId, actualFileName, null, file);
      return { ok: result.ok, fileName: result.fileName || actualFileName };
    },
    [performOperation],
  );

  const download = useCallback(
    async (entityId: string, fileName: string, shareToken?: string | null) => {
      const result = await performOperation('download', entityId, fileName, shareToken);
      return { ok: result.ok, fileUrl: result.fileUrl };
    },
    [performOperation],
  );

  const remove = useCallback(async (entityId: string, fileName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setFileUrl(null);
    try {
      const result = await deleteEntityFile(entityType, entityId, fileName);
      if (!result) {
        throw new Error('Delete failed');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = () => {
    setFileUrl(null);
    setError(null);
  };

  return { upload, download, remove, reset, isLoading, error, fileUrl };
}
