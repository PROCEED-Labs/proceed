'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps, ModalProps } from 'antd';
import ProcessModal from './process-modal';
import { createProcess } from '@/lib/helpers/processHelpers';
import { addProcesses } from '@/lib/data/processes';
import { useParams, useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { spaceURL } from '@/lib/utils';

type ProcessCreationButtonProps = ButtonProps & {
  customAction?: (values: { name: string; description: string }) => Promise<any>;
  wrapperElement?: ReactNode;
  defaultOpen?: boolean;
  modalProps?: ModalProps;
};

/**
 *
 * Button to create Processes including a Modal for inserting needed values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const ProcessCreationButton: React.FC<ProcessCreationButtonProps> = ({
  wrapperElement,
  customAction,
  defaultOpen = false,
  modalProps,
  ...props
}) => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(defaultOpen);
  const router = useRouter();
  const environment = useEnvironment();
  const folderId = useParams<{ folderId: string }>().folderId ?? '';

  const createNewProcess = async (values: { name: string; description: string }[]) => {
    // Invoke the custom handler otherwise use the default server action.
    const process = await (customAction?.(values[0]) ??
      addProcesses(
        values.map((value) => ({ ...value, folderId })),
        environment.spaceId,
      ).then((res) => (Array.isArray(res) ? res[0] : res)));
    if (process && 'error' in process) {
      return process;
    }
    setIsProcessModalOpen(false);

    if (process && 'id' in process) {
      router.push(spaceURL(environment, `/processes/${process.id}`));
    } else {
      router.refresh();
    }
  };

  useAddControlCallback(
    'process-list',
    ['control+enter', 'new'],
    () => {
      if (!isProcessModalOpen) {
        setIsProcessModalOpen(true);
      }
    },
    {
      level: 1,
      blocking: false,
    },
  );

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
        open={isProcessModalOpen}
        title="Create Process"
        okText="Create"
        onCancel={() => setIsProcessModalOpen(false)}
        onSubmit={createNewProcess}
        modalProps={modalProps}
      />
    </>
  );
};

export default ProcessCreationButton;
