'use client';

import React from 'react';
import styles from './layout.module.scss';
import { FC, PropsWithChildren, useState } from 'react';
import { Layout as AntLayout, Menu, MenuProps, Space } from 'antd';
import {
  EditOutlined,
  ProfileOutlined,
  FileAddOutlined,
  SettingOutlined,
  ApiOutlined,
  StarOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import cn from 'classnames';
import Content from '@/components/content';
import HeaderActions from '@/components/header-actions';

type AuthLayoutProps = PropsWithChildren<{
  headerContent: React.ReactNode | undefined;
}>;

// keys need to be unique <identifier>:<path>
const items: MenuProps['items'] = [
  {
    key: 'processLabel:processes',
    label: 'Processes',
    type: 'group',
  },
  {
    key: 'processGroup:processes',
    icon: <EditOutlined />,
    label: 'Process List',
    children: [
      {
        key: 'editProcesses:processes',
        icon: <EditOutlined />,
        label: 'My Processes',
      },
      {
        key: 'newProcess:newProcess',
        icon: <FileAddOutlined />,
        label: 'New Process',
        disabled: true,
      },
      {
        key: 'favoriteProcess:favorites',
        icon: <StarOutlined />,
        label: 'Favorites',
        disabled: true,
      },
    ],
  },
  // {
  //   key: 'newProcess',
  //   icon: <FileAddOutlined />,
  //   label: 'New Process',
  //   disabled: true,
  // },
  {
    key: 'templateGroup:templates',
    icon: <ProfileOutlined />,
    label: 'Templates',
    disabled: false,
    children: [
      {
        key: 'newTemplate:newTemplate',
        icon: <FileAddOutlined />,
        label: 'New Template',
        disabled: true,
      },
      {
        key: 'favoriteTemplates:favorites',
        icon: <StarOutlined />,
        label: 'Favorites',
        disabled: true,
      },
    ],
  },
  // {
  //   key: 'execution',
  //   icon: <PlaySquareOutlined />,
  //   label: 'Execution',
  //   disabled: true,
  // },

  // { type: 'divider' },

  // {
  //   key: 'projects',
  //   icon: <FundProjectionScreenOutlined />,
  //   label: 'Projects',
  // },
  // {
  //   key: 'tasklist',
  //   icon: <UnorderedListOutlined />,
  //   label: 'Tasklist',
  //   disabled: true,
  // },

  { type: 'divider' },

  {
    key: 'settings',
    label: 'Settings',
    type: 'group',
  },
  {
    key: 'generalSettings',
    icon: <SettingOutlined />,
    label: 'General Settings',
    disabled: true,
  },
  {
    key: 'plugins',
    icon: <ApiOutlined />,
    label: 'Plugins',
    disabled: true,
  },
  // {
  //   key: 'environments',
  //   icon: <DeploymentUnitOutlined />,
  //   label: 'Environments',
  //   disabled: true,
  // },
];

const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const activeSegment = usePathname().split('/')[1] || 'processes';
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AntLayout>
      <AntLayout.Header
        style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}
        className={styles.Header}
      >
        <Image
          src="/proceed.svg"
          alt="PROCEED Logo"
          className={cn(styles.Logo, { [styles.collapsed]: collapsed })}
          width={160}
          height={63}
          priority
        />
        <HeaderActions />
      </AntLayout.Header>
      <AntLayout>
        {/* //TODO: sider's border is 1 px too far right */}
        <AntLayout.Sider
          style={{
            backgroundColor: '#fff',
            borderRight: '1px solid #eee',
          }}
          className={styles.Sider}
          collapsible
          collapsed={collapsed}
          onCollapse={(collapsed) => setCollapsed(collapsed)}
          trigger={null}
          breakpoint="md"
        >
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[activeSegment]}
            items={items}
            onClick={({ key }) => {
              const path = key.split(':').at(-1);
              router.push(`/${path}`);
            }}
          />
        </AntLayout.Sider>
        <AntLayout>
          <Content>
            <Space direction="vertical" size="large" style={{ display: 'flex' }}>
              <div className={cn(styles.Main, { [styles.collapsed]: collapsed })}>{children}</div>
            </Space>
          </Content>
        </AntLayout>
      </AntLayout>
      <AntLayout.Footer className={cn(styles.Footer)}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          © 2023 PROCEED Labs GmbH
        </Space>
      </AntLayout.Footer>
    </AntLayout>
  );
};

export default AuthLayout;
