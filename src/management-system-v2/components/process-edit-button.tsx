'use client';

import React, { ReactNode, useState, useTransition } from 'react';

import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import ProcessModal from './process-modal';
import { useGetAsset, usePutAsset } from '@/lib/fetch-data';
import { updateProcess } from '@/lib/data/processes';

type ProcessEditButtonProps = ButtonProps & {
  process: { definitionId: string; description: string; definitionName: string };
  wrapperElement?: ReactNode;
  onEdited?: () => any;
};

/**
 * Button to edit Processes including a Modal for updating values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const ProcessEditButton: React.FC<ProcessEditButtonProps> = ({
  process,
  wrapperElement,
  onEdited,
  ...props
}) => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const editProcess = async (values: { name: string; description?: string }) => {
    startTransition(async () => {
      await updateProcess(process.definitionId, undefined, values.description, values.name);
      onEdited && onEdited();
    });
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
          name: process.definitionName,
          description: process.description,
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
