import React from 'react';
import { Button, Space, Upload, message } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import { scaleDownImage } from '@/lib/helpers/imageHelpers';
import { useFileManager } from '@/lib/useFileManager';
import { enableUseFileManager } from 'FeatureFlags';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';

interface ImageUploadProps {
  imageExists?: boolean;
  onImageUpdate: (imageFileName?: string) => void;
  onUploadFail?: () => void;
  onReload?: () => void;
  endpoints: {
    postEndpoint: string;
    deleteEndpoint?: string;
    putEndpoint?: string;
  };
  config: {
    entityType: EntityType; // to decide where to save the file
    entityId: string; // needed for folder hierarchy
    useDefaultRemoveFunction: boolean; //set true if delete should be automatically handled by file maanger
    fileName?: string;
  };
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  imageExists,
  onImageUpdate,
  onUploadFail,
  onReload,
  endpoints,
  config,
}) => {
  const { upload, remove, replace } = useFileManager({ entityType: config.entityType });

  const handleImageUpload = async (image: Blob, uploadedFileName: string, imageExists: boolean) => {
    try {
      if (enableUseFileManager) {
        const response = await new Promise<{ ok: boolean; fileName?: string }>(
          (resolve, reject) => {
            if (imageExists && config.fileName) {
              //replace
              replace(image, config.entityId, config.fileName, uploadedFileName, {
                onSuccess: (data) => resolve({ ok: true, fileName: data?.fileName }),
                onError: (error) => {
                  console.error('Upload failed:', error);
                  resolve({ ok: false });
                },
              });
            } else {
              // new upload
              upload(image, config.entityId, uploadedFileName, {
                onSuccess: (data) => resolve({ ok: true, fileName: data?.fileName }),
                onError: (error) => {
                  console.error('Upload failed:', error);
                  resolve({ ok: false });
                },
              });
            }
          },
        );

        if (!response.ok) {
          onUploadFail?.();
          return;
        }

        const newImageFileName = response.fileName || uploadedFileName;
        onImageUpdate(newImageFileName);
        onReload?.();
      } else {
        // should be removed after we fully switch to db and gcp
        const uploadEndpoint = imageExists ? endpoints.putEndpoint : endpoints.postEndpoint;

        if (!uploadEndpoint) {
          throw new Error('No upload endpoint provided');
        }

        const response = await fetch(uploadEndpoint, {
          method: imageExists ? 'PUT' : 'POST',
          body: image,
        });

        if (!response.ok) {
          onUploadFail?.();
          return;
        }

        const newImageFileName = await response.text();
        onImageUpdate(newImageFileName);
        onReload?.();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      onUploadFail?.();
    }
  };

  return (
    <Space>
      <Upload
        accept=".jpeg,.jpg,.png,.webp,.svg"
        showUploadList={false}
        beforeUpload={() => false}
        onChange={async ({ fileList }) => {
          const uploadFile = fileList.pop(); // Get the last uploaded file
          if (!uploadFile || !uploadFile.originFileObj) return;
          try {
            const image =
              uploadFile.originFileObj.size > 2000000
                ? await scaleDownImage(uploadFile.originFileObj, 1500)
                : uploadFile.originFileObj;

            await handleImageUpload(image, uploadFile.name, Boolean(imageExists));
          } catch (error) {
            console.error('Image scaling/upload failed:', error);
            onUploadFail?.();
          }
        }}
      >
        <Button type="default" ghost>
          {imageExists ? <EditOutlined /> : 'Add Image'}
        </Button>
      </Upload>

      {imageExists && endpoints.deleteEndpoint && (
        <Button
          onClick={async () => {
            try {
              if (enableUseFileManager) {
                config.useDefaultRemoveFunction
                  ? await remove(config.entityId, config.fileName!)
                  : null;
              } else {
                await fetch(endpoints.deleteEndpoint as string, {
                  method: 'DELETE',
                });
              }
              onImageUpdate();
            } catch (error) {
              console.error('Delete failed:', error);
              onUploadFail?.();
            }
          }}
          type="default"
          ghost
        >
          <DeleteOutlined />
        </Button>
      )}
    </Space>
  );
};

export default ImageUpload;
