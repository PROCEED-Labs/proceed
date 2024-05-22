'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import MachineConfigModal from './machine-config-modal'; //TODO
import { createMachineConfig } from '@/lib/data/legacy/machine-config'; //TODO
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { spaceURL } from '@/lib/utils';

type MachineConfigCreationButtonProps = ButtonProps & {
  customAction?: (values: { name: string; description: string }) => Promise<any>;
  wrapperElement?: ReactNode;
};

/**
 *
 * Button to create MachineConfigs including a Modal for inserting needed values. Alternatively, a custom wrapper element can be used instead of a button.
 */
const MachineConfigCreationButton: React.FC<MachineConfigCreationButtonProps> = ({
  wrapperElement,
  customAction,
  ...props
}) => {
  const [isMachineConfigModalOpen, setIsMachineConfigModalOpen] = useState(false);
  const router = useRouter();
  const environment = useEnvironment();
  const folderId = useParams<{ folderId: string }>().folderId ?? '';

  const createNewMachineConfig = async (
    values: { name: string; description: string }[], //TODO - I don't REALLY know why this is an array
  ) => {
    // Invoke the custom handler otherwise use the default server action.
    /* const process = await (customAction?.(values[0]) ??
        addProcesses(
          values.map((value) => ({ ...value, folderId })),
          environment.spaceId,
        ).then((res) => (Array.isArray(res) ? res[0] : res)));
      if (process && 'error' in process) {
        return process;
      } */
    const machineConfig = await (customAction?.(values[0]) ??
      createMachineConfig(values[0]).then((res) => (Array.isArray(res) ? res[0] : res))); //TODO - array stuff
    if (machineConfig && 'error' in machineConfig) {
      return machineConfig;
    }
    setIsMachineConfigModalOpen(false);
  };

  useAddControlCallback(
    'machine-config-list',
    'controlenter',
    () => {
      if (!isMachineConfigModalOpen) {
        setIsMachineConfigModalOpen(true);
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
            setIsMachineConfigModalOpen(true);
          }}
        >
          {wrapperElement}
        </div>
      ) : (
        <Button
          {...props}
          onClick={() => {
            setIsMachineConfigModalOpen(true);
          }}
        ></Button>
      )}
      <MachineConfigModal
        open={isMachineConfigModalOpen}
        title="Create MachineConfig"
        okText="Create"
        onCancel={() => setIsMachineConfigModalOpen(false)}
        onSubmit={createNewMachineConfig}
      />
    </>
  );
};

export default MachineConfigCreationButton;
