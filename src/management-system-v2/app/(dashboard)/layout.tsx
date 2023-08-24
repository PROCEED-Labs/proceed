'use client';

import React from 'react';
import styles from './layout.module.scss';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import {
  Layout as AntLayout,
  Button,
  Col,
  Menu,
  MenuProps,
  Popover,
  Row,
  Space,
  Tooltip,
} from 'antd';
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
  StarOutlined,
} from '@ant-design/icons';
import Logo from '@/public/proceed.svg';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import cn from 'classnames';
import Content from '@/components/content';
import HeaderMenu from '@/components/content-based-header';

type AuthLayoutProps = PropsWithChildren<{
  headerContent: React.ReactNode | undefined;
}>;

const items: MenuProps['items'] = [
  {
    key: 'processes',
    label: 'Processes',
    type: 'group',
  },
  {
    key: 'processes',
    icon: <EditOutlined />,
    label: 'Process List',
    children: [
      {
        key: 'processes',
        icon: <EditOutlined />,
        label: 'My Processes',
      },
      {
        key: 'newProcess',
        icon: <FileAddOutlined />,
        label: 'New Process',
        disabled: true,
      },
      {
        key: 'processFavorites',
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
    key: 'templates',
    icon: <ProfileOutlined />,
    label: 'Templates',
    disabled: false,
    children: [
      {
        key: 'newTemplate',
        icon: <FileAddOutlined />,
        label: 'New Template',
        disabled: true,
      },
      {
        key: 'templateFavorites',
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
        style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee', display: 'flex' }}
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

        {<HeaderMenu />}
        <div style={{ flex: '1' }}></div>
        <Space
          style={{
            justifySelf: 'end',
          }}
        >
          <Button type="text">
            <u>Logout</u>
          </Button>
          <Tooltip title="Account Settings">
            {/* <Popover
              content={<a href>User Profile</a>}
              title="Settings"
              trigger="click"
              open={openUserSettings}
              onOpenChange={handleOpenChangeUserSettings}
            > */}
            <Button
              shape="circle"
              icon={<UserOutlined />}
              onClick={() => {
                router.push('/profile');
              }}
            />
            {/* </Popover> */}
          </Tooltip>
        </Space>
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
              router.push(`/${key}`);
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
