import { useState, useCallback } from 'react';
import { deleteFile, retrieveFile, saveFile } from './data/file-manager';
import { useEnvironment } from '@/components/auth-can';

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
    processId: string,
    fileName?: string,
  ) => Promise<{ ok: boolean; fileName: string }>;
  download: (processId: string, fileName: string) => Promise<{ ok: boolean }>;
  remove: (processId: string, fileName: string) => Promise<boolean>;
  reset: () => void;
  isLoading: boolean;
  error: string | null;
  downloadUrl: string | null;
}

const DEPLOYMENT_ENV = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV as DeploymentEnv;

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
  processId: string,
  fileName: string,
  file?: File | Blob | null,
): Promise<Response> => {
  const url = `${window.location.origin}/api/file-manager?environmentId=${spaceId}&processId=${processId}&fileName=${fileName}`;
  return fetch(url, { method, body: file });
};

export function useFileManager(): UseFileManagerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const { spaceId } = useEnvironment();

  const handleFileOperation = useCallback(
    async (
      operation: FileOperation,
      file: File | Blob | null,
      fileName: string,
      processId: string,
    ): Promise<FileManagerResult> => {
      try {
        if (operation === 'upload') {
          console.log(file?.size);
          if (DEPLOYMENT_ENV === 'cloud') {
            const { presignedUrl, fileName: newFileName } = await saveFile(
              fileName,
              file!.type,
              processId,
            );
            if (presignedUrl! && typeof presignedUrl === 'string') {
              const uploadResponse = await handleCloudUpload(file!, presignedUrl);
              return { success: true, url: uploadResponse.url, fileName: newFileName };
            }
          } else {
            const response = await handleLocalOperation('PUT', spaceId, processId, fileName, file!);
            return { success: response.status === 200, fileName: await response.text() };
          }
        } else if (operation === 'download') {
          if (DEPLOYMENT_ENV === 'cloud') {
            const presignedGETUrl = await retrieveFile(fileName, processId);
            const fileResponse = await fetch(presignedGETUrl as string);
            if (!fileResponse.ok) {
              throw new Error(`Download failed! status: ${fileResponse.status}`);
            }
            const blob = await fileResponse.blob();
            return { success: true, data: blob };
          } else {
            const response = await handleLocalOperation('GET', spaceId, processId, fileName);
            if (response.status === 200) {
              const blob = await response.blob();
              return { success: true, data: blob };
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
      processId: string,
      fileName: string,
      file?: File | Blob,
    ): Promise<{ ok: boolean; fileName?: string }> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await handleFileOperation(operation, file || null, fileName, processId);
        if (!result.success) {
          throw new Error(result.error);
        }
        if (operation === 'download' && result.data) {
          setDownloadUrl(URL.createObjectURL(result.data));
        }
        return { ok: true, fileName: result.fileName };
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
      processId: string,
      fileName?: string,
    ): Promise<{ ok: boolean; fileName: string }> => {
      const actualFileName =
        fileName || (file instanceof File ? file.name : generateFileName(file));
      const result = await performOperation('upload', processId, actualFileName, file);
      return { ok: result.ok, fileName: result.fileName || actualFileName };
    },
    [performOperation],
  );

  const download = useCallback(
    async (processId: string, fileName: string) =>
      await performOperation('download', processId, fileName),
    [performOperation],
  );

  const remove = useCallback(async (processId: string, fileName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setDownloadUrl(null);
    try {
      const result = await deleteFile(fileName, processId);
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
    setDownloadUrl(null);
    setError(null);
  };
  return { upload, download, remove, reset, isLoading, error, downloadUrl };
}
