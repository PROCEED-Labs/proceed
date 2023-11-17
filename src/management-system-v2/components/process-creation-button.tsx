'use client';

import React, { ReactNode, useState } from 'react';

import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import ProcessModal from './process-modal';
import { usePostAsset } from '@/lib/fetch-data';
import { createProcess } from '@/lib/helpers/processHelpers';

type ProcessCreationButtonProps = ButtonProps & {
  createProcess?: (values: { name: string; description?: string }) => any;
  wrapperElement?: ReactNode;
};

/**
 *
 * Button to create Processes including a Modal for inserting needed values. Alternatively, a custom wrapper element can be used instead of a button.
 * Custom function for creation of process using inserted values can be applied
 */
const ProcessCreationButton: React.FC<ProcessCreationButtonProps> = ({
  createProcess: customCreateProcess,
  wrapperElement,
  ...props
}) => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const { mutateAsync: postProcess } = usePostAsset('/process');

  const createNewProcess = async (values: { name: string; description?: string }) => {
    const { metaInfo, bpmn } = await createProcess(values);
    try {
      await postProcess({
        body: { bpmn: bpmn, departments: [] },
      });
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
        close={(values) => {
          setIsProcessModalOpen(false);

          if (values) {
            customCreateProcess ? customCreateProcess(values) : createNewProcess(values);
          }
        }}
        show={isProcessModalOpen}
      ></ProcessModal>
    </>
  );
};

export default ProcessCreationButton;
