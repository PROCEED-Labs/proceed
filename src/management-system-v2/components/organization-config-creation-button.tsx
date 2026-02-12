'use client';

import React, { ReactNode } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { addParentConfig } from '@/lib/data/db/machine-config'; //TODO refactoring not using term "machine config"
import { useRouter } from 'next/navigation';
import { useEnvironment } from './auth-can';
import { spaceURL } from '@/lib/utils';
import { defaultOrganizationConfigurationTemplate } from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import { useContext } from 'react';
import { UserSpacesContext } from '@/app/(dashboard)/[environmentId]/layout-client';

type ConfigCreationButtonProps = ButtonProps & {
  wrapperElement?: ReactNode;
};

// COMPONENT KIND OF OBSOLETE NOW
const OrganizationConfigCreationButton: React.FC<ConfigCreationButtonProps> = ({
  wrapperElement,
  ...props
}) => {
  const router = useRouter();
  const environment = useEnvironment();
  const userSpaces = useContext(UserSpacesContext);
  const org = userSpaces?.find((s) => s.id === environment.spaceId);
  const organizationName = org && 'name' in org ? org?.name : '';

  const createNewConfig = async () => {
    const config = await addParentConfig(
      {
        ...defaultOrganizationConfigurationTemplate(environment.spaceId, organizationName),
      },
      environment.spaceId,
    );
    if (config && 'error' in config) {
      return config;
    }
    if (config && 'storeId' in config) {
      router.push(spaceURL(environment, `/machine-config/${config.storeId}`)); //TODO refactoring not using term "machine config"
      router.refresh();
    } else {
      router.refresh();
    }
  };
  return (
    <>
      {wrapperElement ? (
        <div onClick={() => createNewConfig()}>{wrapperElement}</div>
      ) : (
        <Button {...props} onClick={() => createNewConfig()} />
      )}
    </>
  );
};

export default OrganizationConfigCreationButton;
