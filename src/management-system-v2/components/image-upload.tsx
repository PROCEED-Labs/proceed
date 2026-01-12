import React, { ReactNode, useEffect, useState } from 'react';
import {
  Button,
  Image,
  ImageProps,
  Progress,
  Space,
  Spin,
  Upload,
  UploadProps,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import { MAX_CONTENT_LENGTH, useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { scaleDownImage } from '@/lib/helpers/imageHelpers';
import path from 'node:path';

export const fallbackImage =
  'data:image/png;base64,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';

type ImageUploadData = {
  onImageUpdate?: (imageFileName?: string) => void;
  config: {
    entityType: EntityType; // to decide where to save the file
    entityId: string; // needed for folder hierarchy
    dontUpdateProcessArtifactsReferences?: boolean;
  };
  fileManagerErrorToasts?: boolean;
  imageProps?: ImageProps;
  uploadProps?: UploadProps;
  basicLoadingFeedback?: boolean;
  // Managed
  fileName?: string;
};

export const useImageUpload = ({
  onImageUpdate,
  fileName,
  config,
  fileManagerErrorToasts,
}: ImageUploadData) => {
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();

  const imageExists = !!fileName;

  const {
    remove,
    getUploadUrl,
    isLoading: fileManagerLoading,
    download,
  } = useFileManager({
    entityType: config.entityType,
    errorToasts: fileManagerErrorToasts,
    dontUpdateProcessArtifactsReferences: config.dontUpdateProcessArtifactsReferences,
  });

  const customUploadRequest: UploadProps['customRequest'] = async ({ file }) => {
    let imageDeleted = false;
    try {
      if (!(file instanceof File) || !('size' in file)) return;

      const uploadFileName = file.name;
      let image: File | Blob = file;
      if (file.size > 2000000) {
        image = await scaleDownImage(file, 1500);
      }

      if (imageExists) {
        await remove({ entityId: config.entityId, filePath: fileName });
        imageDeleted = true;
      }

      const { uploadUrl } = await getUploadUrl({
        fileType: image.type,
        entityId: config.entityId,
        filePath: uploadFileName,
      });

      const xhr = new XMLHttpRequest();
      const urlObj = new URL(uploadUrl);
      const pathname = urlObj.pathname.split('/');
      pathname.shift();
      pathname.shift();
      const realUploadFileName = decodeURIComponent(pathname.join('/'));
      console.log('Uploading image to ', realUploadFileName);
      xhr.open('PUT', uploadUrl, true);
      xhr.responseType = 'text';
      xhr.setRequestHeader('x-goog-content-length-range', `0,${MAX_CONTENT_LENGTH}`);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', (_) => {
        setUploadProgress(undefined);

        if (xhr.status === 200) {
          onImageUpdate?.(xhr.response || realUploadFileName);
        } else {
          message.error(xhr.statusText || 'Image upload failed.');
        }
      });
      xhr.addEventListener('abort', (_) => {
        setUploadProgress(undefined);
        message.error('Image upload aborted.');
      });

      xhr.addEventListener('error', (_) => {
        setUploadProgress(undefined);
        message.error('Image upload failed. Please try again.');
      });

      xhr.send(image);
    } catch (e) {
      console.error(e);
      if (imageDeleted) {
        onImageUpdate?.(undefined);
      }
    }
  };

  return { customUploadRequest, uploadProgress, fileManagerLoading, download, remove };
};

type ImageUploadProps = ImageUploadData & {
  onUploadFail?: () => void;
  deletable?: boolean;
  disabled?: boolean;
  imageProps?: ImageProps;
  uploadProps?: UploadProps;
  basicLoadingFeedback?: boolean;
  imagePreview?: ReactNode | ((fileUrl: string | undefined) => ReactNode);
  // Unmanaged
  initialFileName?: string;
};

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpdate,
  onUploadFail,
  imageProps,
  uploadProps,
  config,
  initialFileName,
  disabled = false,
  deletable = true,
  fileManagerErrorToasts = true,
  basicLoadingFeedback = false,
  imagePreview,
  ...props
}) => {
  // The component has a `fileName` (which can be either managed from within the component, or
  // via the props)
  // With `fileName` we determine whether there is a picture or not, we also use the fileName to get
  // the fileUrl from the server
  const [componentManagedFileName, setComponentManagedFileName] = useState<string | undefined>(
    initialFileName,
  );
  const [fileUrl, setFileUrl] = useState<string | undefined>();

  const [maskVisible, setMaskVisible] = useState(false);

  const fileName = 'fileName' in props ? props.fileName : componentManagedFileName;
  const imageExists = !!fileName;

  const { customUploadRequest, uploadProgress, fileManagerLoading, download, remove } =
    useImageUpload({
      config,
      fileName,
      fileManagerErrorToasts,
      onImageUpdate: (imageFileName) => {
        setComponentManagedFileName(imageFileName);
        onImageUpdate?.(imageFileName);
      },
    });

  useEffect(() => {
    async function downloadFile() {
      // "loading" state
      setFileUrl(undefined);

      console.log('Downloading image for fileName:', fileName);

      if (fileName === undefined) {
        return;
      }

      if (fileName.startsWith('public/')) {
        setFileUrl(fileName.replace('public/', '/'));
        return;
      }

      try {
        const result = await download({
          entityId: config.entityId,
          filePath: fileName,
        });
        if (!result.fileUrl) throw new Error('Response does not contain fileUrl');

        setFileUrl(result.fileUrl);
      } catch (error) {
        console.error('Download failed:', error);
        message.error('Failed to download image.');
      }
    }

    downloadFile();
  }, [config.entityId, download, fileName]);

  let loadingIndicator;
  if (uploadProgress !== undefined) {
    if (basicLoadingFeedback) {
      loadingIndicator = `Uploading ${Math.floor(uploadProgress)}%`;
    } else {
      loadingIndicator = (
        <Progress type="circle" percent={uploadProgress} size="small" showInfo={false} />
      );
    }
  } else if (fileManagerLoading) {
    loadingIndicator = basicLoadingFeedback ? 'Loading...' : <Spin spinning />;
  }

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'transparent',
      }}
      onMouseEnter={() => setMaskVisible(true)}
      onMouseLeave={() => setMaskVisible(false)}
      role="group"
      aria-label="image-upload"
    >
      {loadingIndicator && (
        <div
          style={{
            // Center the progress bar
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Image overlay
            position: 'absolute',
            width: '100%',
            height: '100%',
            zIndex: 10,
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          {loadingIndicator}
        </div>
      )}

      <Upload
        accept={'.jpeg,.jpg,.png,.webp,.svg'}
        showUploadList={false}
        disabled={disabled}
        customRequest={customUploadRequest}
        {...uploadProps}
      >
        {imagePreview ? (
          typeof imagePreview === 'function' ? (
            imagePreview(fileUrl)
          ) : (
            imagePreview
          )
        ) : (
          <Image
            src={fileUrl || fallbackImage}
            fallback={fallbackImage}
            // TODO
            // alt={organization.name}
            preview={{
              visible: false,
              mask: false,
            }}
            role="group"
            alt="Image"
            {...imageProps}
            style={{
              width: '100%',
              maxHeight: '7.5rem',
              borderRadius: '6px',
              display: 'block',
              border: '1px solid #d9d9d9',
              ...imageProps?.style,
            }}
          />
        )}

        <div
          style={{
            zIndex: 10,
            // The mask was done this way, since otherwise it wouldn't work in the task builder, as
            // there ant design's style don't work
            display: maskVisible && !loadingIndicator ? 'flex' : 'none',
            // center div
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button type="default" ghost disabled={disabled}>
              {imageExists ? <EditOutlined /> : 'Add Image'}
            </Button>

            {imageExists && deletable && (
              <Button
                onClick={async (e) => {
                  e.stopPropagation(); // Don't trigger upload

                  try {
                    await remove({ entityId: config.entityId, filePath: fileName });

                    setFileUrl(undefined);
                    setComponentManagedFileName(undefined);
                    onImageUpdate?.(undefined);
                  } catch (error) {
                    onUploadFail?.();
                  }
                }}
                type="default"
                ghost
                disabled={disabled}
              >
                <DeleteOutlined />
              </Button>
            )}
          </div>
        </div>
      </Upload>
    </div>
  );
};

export default ImageUpload;
