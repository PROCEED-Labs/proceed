'use client';

import React, { ReactNode, useMemo, useState } from 'react';

import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import ProcessModal from './process-modal';
import { updateProcess } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';
import { ProcessListProcess } from './processes';

type ProcessEditButtonProps = ButtonProps & {
  process: ProcessListProcess;
  wrapperElement?: ReactNode;
};

/**
 * Button to edit Processes including a Modal for updating values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const ProcessEditButton: React.FC<ProcessEditButtonProps> = ({
  process,
  wrapperElement,
  ...props
}) => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const router = useRouter();
  const data = useMemo(
    () => [
      {
        ...process,
        definitionName: process.definitionName.value,
        description: process.description.value,
      },
    ],
    [process],
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
        title="Edit Process"
        initialData={data}
        okText="Save"
        onCancel={() => setIsProcessModalOpen(false)}
        onSubmit={async (values) => {
          const res = await updateProcess(
            process.definitionId,
            undefined,
            values[0].description,
            values[0].definitionName,
          );
          // Let modal handle errors
          if ('error' in res) {
            return res;
          }
          setIsProcessModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
};

export default ProcessEditButton;
