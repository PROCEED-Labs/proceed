'use client';

import React, { ReactNode, useState, useTransition } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import ProcessModal from './process-modal';
import { createProcess } from '@/lib/helpers/processHelpers';
import { addProcess } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';

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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const createNewProcess = async (values: { name: string; description?: string }) => {
    const { metaInfo, bpmn } = await createProcess(values);
    startTransition(async () => {
      try {
        await addProcess({ bpmn: bpmn, departments: [] });
      } catch (error) {
        console.error(error);
      }
      router.refresh();
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
