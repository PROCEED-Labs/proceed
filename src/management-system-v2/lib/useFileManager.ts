import { use, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/components/auth-can';
import {
  cleanUpFailedUploadEntry,
  deleteEntityFile,
  retrieveEntityFile,
  saveEntityFileOrGetPresignedUrl,
  updateFileDeletableStatus,
} from './data/file-manager-facade';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { message } from 'antd';
import { EnvVarsContext } from '@/components/env-vars-context';

export const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB

interface FileManagerHookProps {
  entityType: EntityType;
  errorToasts?: boolean;
  dontUpdateProcessArtifactsReferences?: boolean;
}

interface FileOperationResult {
  ok: boolean;
  filePath?: string;
  fileUrl?: string;
}

export function useFileManager({
  entityType,
  errorToasts = true,
  dontUpdateProcessArtifactsReferences = false,
}: FileManagerHookProps) {
  const queryClient = useQueryClient();
  const { spaceId } = useEnvironment();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const env = use(EnvVarsContext);
  const DEPLOYMENT_ENV = env.PROCEED_PUBLIC_STORAGE_DEPLOYMENT_ENV;

  // This function returns an endpoint to which we upload the file
  const getUploadUrl = useMutation<
    { uploadUrl: string; filePath?: string },
    Error,
    { fileType: string; entityId: string; filePath: string }
  >({
    mutationFn: async ({ fileType, entityId, filePath }) => {
      if (DEPLOYMENT_ENV === 'cloud') {
        // Get presigned url to upload to an S3 bucket
        const result = await saveEntityFileOrGetPresignedUrl(
          entityType,
          entityId,
          fileType,
          filePath,
          undefined,
          {
            saveWithoutSavingReference: dontUpdateProcessArtifactsReferences,
          },
        );
        if (!('presignedUrl' in result) || !result.presignedUrl)
          throw new Error('Failed to get presignedUrl');

        return { uploadUrl: result.presignedUrl, filePath: result.filePath };
      } else {
        const uploadUrl = `/api/private/file-manager?${new URLSearchParams({
          environmentId: spaceId,
          entityId,
          entityType,
          ...(dontUpdateProcessArtifactsReferences ? { saveWithoutSavingReference: 'true' } : {}),
          ...(filePath ? { filePath } : {}),
        })}`;

        return { uploadUrl };
      }
    },
    onError: (error) => {
      if (errorToasts) message.error(error.message || 'Upload failed');
    },
  });

  // Upload Mutation
  const uploadMutation = useMutation<
    { filePath?: string },
    Error,
    {
      file: File | Blob;
      entityId: string;
      filePath?: string;
      onSuccess?: (data: { filePath?: string }) => void;
      onError?: (error: Error) => void;
    }
  >({
    mutationFn: async ({ file, entityId, filePath }) => {
      const uploadResults = await getUploadUrl.mutateAsync({
        fileType: file.type,
        entityId,
        filePath: filePath || (file instanceof File ? file.name : ''),
      });

      const fetchParams: RequestInit = {
        method: 'PUT',
        body: file,
      };

      if (DEPLOYMENT_ENV === 'cloud')
        fetchParams.headers = {
          'Content-Type': file.type,
          'x-goog-content-length-range': `0,${MAX_CONTENT_LENGTH}`,
        };

      try {
        const response = await fetch(uploadResults.uploadUrl, fetchParams);
        if (!response.ok) throw new Error(`Upload failed! Status: ${response.status}`);

        if (DEPLOYMENT_ENV === 'cloud') return { filePath: uploadResults.filePath! };
        else return { filePath: await response.text() };
      } catch (e) {
        console.error('Failed to upload file', e);

        //if upload fails, delete the artifact from the database
        if (DEPLOYMENT_ENV === 'cloud')
          await cleanUpFailedUploadEntry(spaceId, entityId, entityType, filePath!);

        throw e;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['entityFiles', entityType],
      });

      if (variables.onSuccess) {
        variables.onSuccess(data);
      }
    },
    onError: (error, variables) => {
      if (errorToasts) message.error(error.message || 'Upload failed');
      if (variables.onError) {
        variables.onError(error);
      }
    },
  });

  // Download Mutation
  const downloadMutation = useMutation<
    { fileUrl?: string },
    Error,
    {
      entityId: string;
      filePath: string;
      shareToken?: string | null;
      onSuccess?: (data: { fileUrl?: string }) => void;
      onError?: (error: Error) => void;
    }
  >({
    mutationFn: async ({ entityId, filePath, shareToken }) => {
      if (DEPLOYMENT_ENV === 'cloud') {
        const presignedUrl = await retrieveEntityFile(entityType, entityId, filePath);
        return { fileUrl: presignedUrl as string };
      } else {
        const fileUrl = `/api/private/file-manager?${new URLSearchParams({
          environmentId: spaceId,
          entityId: entityId,
          entityType: entityType,
          filePath,
          ...(shareToken ? { shareToken } : {}),
        })}`;

        return { fileUrl };
      }
    },
    onSuccess: (data, variables) => {
      if (data.fileUrl) setFileUrl(data.fileUrl);
      if (variables.onSuccess) {
        variables.onSuccess(data);
      }
    },
    onError: (error, variables) => {
      if (errorToasts) message.error(error.message || 'Download failed');
      if (variables.onError) {
        variables.onError(error);
      }
    },
  });

  // Remove Mutation
  const removeMutation = useMutation<boolean, Error, { entityId: string; filePath?: string }>({
    mutationFn: async ({ entityId, filePath }) => {
      if (entityType === EntityType.PROCESS) {
        if (!filePath) throw new Error('File name is required when deleting process entity type');
        if (!dontUpdateProcessArtifactsReferences) {
          await updateFileDeletableStatus(filePath, true, entityId);
        }
      } else {
        await deleteEntityFile(entityType, entityId, filePath);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['entityFiles', entityType],
      });
    },
    onError: (error) => {
      if (errorToasts) message.error(error.message || 'Delete failed');
    },
  });

  // Replace Mutation
  const replaceMutation = useMutation<
    FileOperationResult,
    Error,
    {
      file: File | Blob;
      entityId: string;
      oldFilePath?: string;
      newFilePath?: string;
      onSuccess?: (data: { filePath?: string }) => void;
      onError?: (error: Error) => void;
    }
  >({
    mutationFn: async ({ file, entityId, oldFilePath, newFilePath }) => {
      // First remove the old file
      await removeMutation.mutateAsync({ entityId, filePath: oldFilePath });

      // Then upload the new file
      const uploadResult = await uploadMutation.mutateAsync({
        file,
        entityId,
        filePath: newFilePath,
      });

      return {
        ok: true,
        filePath: uploadResult.filePath,
      };
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({
        queryKey: ['entityFiles', entityType],
      });

      if (variables.onSuccess) {
        variables.onSuccess(data);
      }
    },
    onError: (error) => {
      if (errorToasts) message.error(error.message || 'Replace failed');
    },
  });

  return {
    upload: uploadMutation.mutateAsync,
    download: downloadMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    replace: replaceMutation.mutateAsync,
    getUploadUrl: getUploadUrl.mutateAsync,
    isLoading:
      uploadMutation.isPending ||
      downloadMutation.isPending ||
      removeMutation.isPending ||
      replaceMutation.isPending ||
      getUploadUrl.isPending,
    error:
      uploadMutation.error ||
      downloadMutation.error ||
      removeMutation.error ||
      removeMutation.error,
    fileUrl,
  };
}
