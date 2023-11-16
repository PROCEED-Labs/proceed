'use client';

import React, { ReactNode, useState } from 'react';

import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import ProcessModal from './process-modal';
import { useGetAsset, usePutAsset } from '@/lib/fetch-data';

type ProcessEditButtonProps = ButtonProps & {
  definitionId: string;
  wrapperElement?: ReactNode;
  onEdited?: () => any;
};

/**
 * Button to edit Processes including a Modal for updating values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const ProcessEditButton: React.FC<ProcessEditButtonProps> = ({
  definitionId,
  wrapperElement,
  onEdited,
  ...props
}) => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const { data: processData } = useGetAsset('/process/{definitionId}', {
    params: { path: { definitionId } },
  });

  const { mutateAsync: updateProcess } = usePutAsset('/process/{definitionId}');

  const editProcess = async (values: { name: string; description?: string }) => {
    try {
      await updateProcess({
        params: { path: { definitionId } },
        body: { ...values },
      });
      onEdited && onEdited();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {wrapperElement ? (
        <div
          onClick={() => {
            setIsProcessModalOpen(true);
          }}
        >
          {wrapperElement}
        </div>
      ) : (
        <Button
          {...props}
          onClick={() => {
            setIsProcessModalOpen(true);
          }}
        ></Button>
      )}
      <ProcessModal
        initialProcessData={{
          name: processData?.definitionName,
          description: processData?.description,
        }}
        close={(values) => {
          setIsProcessModalOpen(false);

          if (values) {
            editProcess(values);
          }
        }}
        show={isProcessModalOpen}
      ></ProcessModal>
    </>
  );
};

export default ProcessEditButton;
