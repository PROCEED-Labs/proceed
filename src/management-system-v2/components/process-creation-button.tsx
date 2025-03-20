import React, { ComponentProps, ReactNode, useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps, ModalProps } from 'antd';
import ProcessModal from './process-modal';
import { addProcesses } from '@/lib/data/processes';
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { spaceURL } from '@/lib/utils';

export const ProcessCreationModal: React.FC<
  Partial<ComponentProps<typeof ProcessModal>> & {
    open: boolean;
    setOpen: (open: boolean) => void;
    templates?: any[];
    customAction?: (values: {
      name: string;
      description: string;
      templateId?: string;
    }) => Promise<any>;
    type?: 'process' | 'template';
  }
> = ({ open, setOpen, customAction, templates = [], type = 'process', ...props }) => {
  const router = useRouter();
  const environment = useEnvironment();
  const folderId = useParams<{ folderId: string }>().folderId ?? '';

  const createNewProcess = async (
    values: { name: string; description: string; templateId?: string }[],
  ) => {
    // Invoke the custom handler otherwise use the default server action.
    const process = await (customAction?.(values[0]) ??
      addProcesses(
        values.map((value) => ({ ...value, folderId, type })),
        environment.spaceId,
      ).then((res) => (Array.isArray(res) ? res[0] : res)));

    if (process && 'error' in process) {
      return process;
    }

    setOpen(false);

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
      if (!open) {
        setOpen(true);
      }
    },
    {
      level: 1,
      blocking: false,
    },
  );

  return (
    <ProcessModal
      {...props}
      templates={templates}
      open={open}
      title="Create Process"
      okText="Create"
      onCancel={() => setOpen(false)}
      onSubmit={createNewProcess}
      type={type}
    />
  );
};

type ProcessCreationButtonProps = ButtonProps & {
  templates?: any[];
  customAction?: (values: { name: string; description: string }) => Promise<any>;
  wrapperElement?: ReactNode;
  defaultOpen?: boolean;
  modalProps?: ModalProps;
  type?: 'process' | 'template';
};

/**
 *
 * Button to create Processes including a Modal for inserting needed values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const ProcessCreationButton: React.FC<ProcessCreationButtonProps> = ({
  wrapperElement,
  templates = [],
  customAction,
  defaultOpen = false,
  modalProps,
  type,
  ...props
}) => {
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(defaultOpen);

  return (
    <>
      {wrapperElement ? (
        <div onClick={() => setIsProcessModalOpen(true)}>{wrapperElement}</div>
      ) : (
        <Button {...props} onClick={() => setIsProcessModalOpen(true)} />
      )}
      <ProcessCreationModal
        templates={templates}
        open={isProcessModalOpen}
        setOpen={setIsProcessModalOpen}
        customAction={customAction}
        modalProps={modalProps}
        type={type}
      />
    </>
  );
};

export default ProcessCreationButton;
