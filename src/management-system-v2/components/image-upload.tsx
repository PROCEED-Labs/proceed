import React from 'react';
import { Button, Space, Upload } from 'antd';
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
    entityType: EntityType;
    entityId: string;
    useDefaultRemoveFunction: boolean;
    fileName?: string;
    businessObjectId?: string;
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
  const { upload, remove, replace } = useFileManager(config.entityType, config.businessObjectId);

  const handleImageUpload = async (image: Blob, uploadedFileName: string, imageExists: boolean) => {
    try {
      let response;
      if (imageExists && endpoints.putEndpoint) {
        // Update existing image
        response = enableUseFileManager
          ? await replace(image, config.entityId, config.fileName!, uploadedFileName)
          : await fetch(endpoints.putEndpoint, {
              method: 'PUT',
              body: image,
            });
      } else {
        // Add new image
        response = enableUseFileManager
          ? await upload(image, config.entityId, uploadedFileName)
          : await fetch(endpoints.postEndpoint, {
              method: 'POST',
              body: image,
            });
      }

      if (!response.ok) {
        onUploadFail?.();
      } else {
        const newImageFileName =
          response instanceof Response ? await response.text() : response.fileName;
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
