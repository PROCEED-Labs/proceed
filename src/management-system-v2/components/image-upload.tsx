import React from 'react';
import { Button, Space, Upload, message } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import { scaleDownImage } from '@/lib/helpers/imageHelpers';
import { useFileManager } from '@/lib/useFileManager';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';

interface ImageUploadProps {
  imageExists?: boolean;
  onImageUpdate: (imageFileName?: string) => void;
  onUploadFail?: () => void;
  onReload?: () => void;
  deletable?: boolean;
  config: {
    entityType: EntityType; // to decide where to save the file
    entityId: string; // needed for folder hierarchy
    useDefaultRemoveFunction: boolean; //set true if delete should be automatically handled by file manager
    fileName?: string;
  };
  fileManagerErrorToasts?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  imageExists,
  onImageUpdate,
  onUploadFail,
  onReload,
  deletable = true,
  config,
  fileManagerErrorToasts = true,
}) => {
  const { upload, remove, replace } = useFileManager({
    entityType: config.entityType,
    errorToasts: fileManagerErrorToasts,
  });

  const handleImageUpload = async (image: Blob, uploadedFileName: string, imageExists: boolean) => {
    try {
      let response;
      if (imageExists && config.fileName) {
        response = await replace({
          file: image,
          entityId: config.entityId,
          oldFileName: config.fileName,
          newFileName: uploadedFileName,
        });
      } else {
        response = await upload({
          file: image,
          entityId: config.entityId,
          fileName: uploadedFileName,
        });
      }

      const newImageFileName = response.fileName || uploadedFileName;
      onImageUpdate(newImageFileName);
      onReload?.();
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

      {imageExists && deletable && (
        <Button
          onClick={async () => {
            try {
              if (config.useDefaultRemoveFunction)
                await remove({ entityId: config.entityId, fileName: config.fileName! });

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
