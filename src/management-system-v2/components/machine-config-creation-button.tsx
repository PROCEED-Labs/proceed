'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import MachineConfigModal from './machine-config-modal'; //TODO
import { createParentConfig } from '@/lib/data/legacy/machine-config'; //TODO
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { spaceURL } from '@/lib/utils';
import { getCurrentEnvironment } from './auth';

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
  const spaceId = useEnvironment().spaceId;

  const createNewMachineConfig = async (
    values: { name: string; description: string }[], //TODO - I don't REALLY know why this is an array
  ) => {
    const machineConfig = await (customAction?.(values[0]) ??
      createParentConfig(
        {
          description: { label: 'description', value: values[0].description },
          name: values[0].name,
          folderId: folderId,
        },
        environment.spaceId,
      ).then((res) => (Array.isArray(res) ? res[0] : res)));
    if (machineConfig && 'error' in machineConfig) {
      return machineConfig;
    }
    if (machineConfig && 'id' in machineConfig) {
      router.push(spaceURL(environment, `/machine-config/${machineConfig.id}`)); //TODO
    } else {
      router.refresh();
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
        title="Create Machine Configuration"
        okText="Create"
        onCancel={() => setIsMachineConfigModalOpen(false)}
        onSubmit={createNewMachineConfig}
      />
    </>
  );
};

export default MachineConfigCreationButton;
