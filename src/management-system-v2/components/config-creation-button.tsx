'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import MachineConfigModal from './config-modal'; //TODO
import { addParentConfig } from '@/lib/data/legacy/machine-config'; //TODO
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
const ConfigCreationButton: React.FC<ConfigCreationButtonProps> = ({
  wrapperElement,
  customAction,
  ...props
}) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const router = useRouter();
  const environment = useEnvironment();
  const folderId = useParams<{ folderId: string }>().folderId ?? '';

  const createNewConfig = async (
    values: { name: string; description: string }[], //TODO - I don't REALLY know why this is an array
  ) => {
    const config = await (customAction?.(values[0]) ??
      addParentConfig(
        defaultParentConfiguration(values[0].name, values[0].description, folderId),
        environment.spaceId,
      ).then((res) => (Array.isArray(res) ? res[0] : res)));
    if (config && 'error' in config) {
      return config;
    }
    if (config && 'id' in config) {
      router.push(spaceURL(environment, `/machine-config/${config.id}`)); //TODO
    } else {
      router.refresh();
    }
    setIsConfigModalOpen(false);
  };

  useAddControlCallback(
    'machine-config-list',
    'controlenter',
    () => {
      if (!isConfigModalOpen) {
        setIsConfigModalOpen(true);
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
            setIsConfigModalOpen(true);
          }}
        >
          {wrapperElement}
        </div>
      ) : (
        <Button
          {...props}
          onClick={() => {
            setIsConfigModalOpen(true);
          }}
        ></Button>
      )}
      <MachineConfigModal
        open={isConfigModalOpen}
        title="Create Configuration"
        okText="Create"
        onCancel={() => setIsConfigModalOpen(false)}
        onSubmit={createNewConfig}
      />
    </>
  );
};

export default ConfigCreationButton;
