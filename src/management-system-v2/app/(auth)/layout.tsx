'use client';

import React from 'react';
import styles from './layout.module.scss';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { Layout as AntLayout, Button, Menu, MenuProps, Popover, Space, Tooltip } from 'antd';
import {
  DeploymentUnitOutlined,
  FundProjectionScreenOutlined,
  EditOutlined,
  UnorderedListOutlined,
  ProfileOutlined,
  FileAddOutlined,
  PlaySquareOutlined,
  SettingOutlined,
  ApiOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Logo from '@/public/proceed.svg';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import cn from 'classnames';

// type AuthLayoutProps = PropsWithChildren<{
//   headerContent: React.ReactNode | undefined;
// }>;

const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <AntLayout>
      <AntLayout.Header
        style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}
        className={styles.Header}
      >
        <Image
          src="/proceed.svg"
          alt="PROCEED Logo"
          className={cn(styles.Logo /* , { [styles.collapsed]: collapsed } */)}
          width={160}
          height={63}
          priority
        />
      </AntLayout.Header>
      <AntLayout.Content>
        {/* <Space direction="vertical" align="center" size="large" style={{ display: 'flex' }}> */}
        {/* <Space direction="horizontal" align="center"> */}
        <div className={cn(styles.Auth)}>{children}</div>
        {/* </Space> */}
        {/* </Space> */}
      </AntLayout.Content>
      <AntLayout.Footer className={cn(styles.Footer)}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          © 2023 PROCEED Labs GmbH
        </Space>
      </AntLayout.Footer>
    </AntLayout>
  );
};

export default AuthLayout;
