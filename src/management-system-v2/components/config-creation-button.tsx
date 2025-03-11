'use client';

import React, { ComponentProps, ReactNode, useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import MachineConfigModal from './config-modal'; //TODO refactoring not using term "machine config"
// import { addParentConfig } from '@/lib/data/legacy/machine-config'; //TODO refactoring not using term "machine config"
import { addParentConfig } from '@/lib/data/db/machine-config';
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { useAddControlCallback } from '@/lib/controls-store';
import { spaceURL } from '@/lib/utils';
import { defaultParentConfiguration } from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';

type ConfigCreationButtonProps = ButtonProps & {
  customAction?: (values: { name: string; description: string }) => Promise<any>;
  wrapperElement?: ReactNode;
};

/**
 *
 * Button to create Configs including a Modal for inserting needed values. Alternatively, a custom wrapper element can be used instead of a button.
 */
export const ConfigCreationModal: React.FC<
  Partial<ComponentProps<typeof MachineConfigModal>> & {
    open: boolean;
    setOpen: (open: boolean) => void;
    customAction?: (values: { name: string; description: string }) => Promise<any>;
  }
> = ({ open, setOpen, customAction, ...props }) => {
  const router = useRouter();
  const environment = useEnvironment();
  const folderId = useParams<{ folderId: string }>().folderId ?? '';

  const createNewConfig = async (values: { name: string; description: string }[]) => {
    const config = await (customAction?.(values[0]) ??
      addParentConfig(
        defaultParentConfiguration(
          environment.spaceId,
          folderId,
          values[0].name,
          values[0].description,
        ),
        environment.spaceId,
      ).then((res) => (Array.isArray(res) ? res[0] : res)));
    if (config && 'error' in config) {
      return config;
    }
    if (config && 'id' in config) {
      router.push(spaceURL(environment, `/machine-config/${config.id}`)); //TODO refactoring not using term "machine config"
    } else {
      router.refresh();
    }
    setOpen(false);
  };

  useAddControlCallback(
    'machine-config-list',
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
    <MachineConfigModal
      open={open}
      title="Create Configuration"
      okText="Create"
      onCancel={() => setOpen(false)}
      onSubmit={createNewConfig}
    />
  );
};

const ConfigCreationButton: React.FC<ConfigCreationButtonProps> = ({
  customAction,
  wrapperElement,
  ...props
}) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  return (
    <>
      {wrapperElement ? (
        <div onClick={() => setIsConfigModalOpen(true)}>{wrapperElement}</div>
      ) : (
        <Button {...props} onClick={() => setIsConfigModalOpen(true)} />
      )}
      <div onKeyDown={(e) => e.stopPropagation()}>
        <ConfigCreationModal
          open={isConfigModalOpen}
          setOpen={setIsConfigModalOpen}
          customAction={customAction}
        />
      </div>
    </>
  );
};

export default ConfigCreationButton;
