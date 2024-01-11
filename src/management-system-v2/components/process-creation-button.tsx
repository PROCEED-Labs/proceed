'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import ProcessModal from './process-modal';
import { createProcess } from '@/lib/helpers/processHelpers';
import { addProcesses } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';

type ProcessCreationButtonProps = ButtonProps & {
  customAction?: (values: { definitionName: string; description: string }) => Promise<any>;
  wrapperElement?: ReactNode;
};

/**
 *
 * Button to create Processes including a Modal for inserting needed values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const ProcessCreationButton: React.FC<ProcessCreationButtonProps> = ({
  wrapperElement,
  customAction,
  ...props
}) => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const router = useRouter();

  const createNewProcess = async (values: { definitionName: string; description: string }[]) => {
    // Invoke the custom handler otherwise use the default server action.
    const process = await (customAction?.(values[0]) ??
      addProcesses(values).then((res) => (Array.isArray(res) ? res[0] : res)));
    if (process && 'error' in process) {
      return process;
    }
    setIsProcessModalOpen(false);

    if (process && 'definitionId' in process) {
      router.push(`/processes/${process.definitionId}`);
    } else {
      router.refresh();
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
        open={isProcessModalOpen}
        title="Create Process"
        okText="Create"
        onCancel={() => setIsProcessModalOpen(false)}
        onSubmit={createNewProcess}
      />
    </>
  );
};

export default ProcessCreationButton;
