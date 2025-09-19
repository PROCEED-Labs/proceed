'use client';

import React from 'react';

import { useParams } from 'next/navigation';
import ImageUpload from '@/components/image-upload';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';

type ImageSelectionSectionProperties = {
  imageFilePath?: string;
  onImageUpdate: (imageFilePath?: string) => void;
};

const ImageSelectionSection: React.FC<ImageSelectionSectionProperties> = ({
  imageFilePath: imageFileName,
  onImageUpdate,
}) => {
  const { processId } = useParams();

  return (
    <ImageUpload
      config={{
        entityType: EntityType.PROCESS,
        entityId: processId as string,
      }}
      onImageUpdate={onImageUpdate}
      fileName={imageFileName}
      fileManagerErrorToasts={false}
      imageProps={{
        alt: 'Image',
        style: {
          width: '100%',
          height: '100%',
          borderRadius: '6px',
          border: '1px solid #d9d9d9',
        },
        role: 'group',
        ['aria-label']: 'image-section',
      }}
    />
  );
};

export default ImageSelectionSection;
