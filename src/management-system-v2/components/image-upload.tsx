import React from 'react';

import { Button, Space, Upload } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import { scaleDownImage } from '@/lib/helpers/imageHelpers';

const ImageUpload: React.FC<{
  imageExists?: boolean;
  onImageUpdate: (imageFileName?: string) => void;
  onUploadFail?: () => void;
  onReload?: () => void;
  endpoints: {
    postEndpoint: string;
    deleteEndpoint?: string;
    putEndpoint?: string;
  };
}> = ({ imageExists, onImageUpdate, onUploadFail, onReload, endpoints }) => {
  return (
    <Space>
      <Upload
        style={{ color: 'white' }}
        showUploadList={false}
        beforeUpload={() => false} // needed for custom upload of file
        onChange={async ({ fileList }) => {
          const uploadFile = fileList.pop(); // get latest uploaded file
          if (!uploadFile || !uploadFile.originFileObj) return;

          // scale down image to max length of 1500px if file size is over 2mb
          const image =
            uploadFile.originFileObj.size > 2000000
              ? await scaleDownImage(uploadFile.originFileObj, 1500)
              : uploadFile.originFileObj;

          if (endpoints.putEndpoint) {
            // Update existing image
            try {
              const response = await fetch(endpoints.putEndpoint, {
                method: 'PUT',
                body: image,
              });

              if (!response.ok) {
                onUploadFail?.();
              } else {
                onReload?.();
              }
            } catch (err) {
              onUploadFail?.();
            }
          } else {
            // Add new Image
            try {
              const response = await fetch(endpoints.postEndpoint, {
                method: 'POST',
                body: image,
              });
              if (!response.ok) {
                onUploadFail?.();
              } else {
                const newImageFileName = await response.text();
                onImageUpdate(newImageFileName);
              }
            } catch (err) {
              onUploadFail?.();
            }
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
            await fetch(endpoints.deleteEndpoint as string, {
              method: 'DELETE',
            });
            onImageUpdate();
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
