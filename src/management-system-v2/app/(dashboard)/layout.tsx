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
const { SubMenu, Item, Divider, ItemGroup } = Menu;
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
  MenuOutlined
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

const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const activeSegment = usePathname().split('/')[1] || 'processes';
  const [collapsed, setCollapsed] = useState(false);

  const items: MenuProps['items'] = [
    {
      key: 'processes',
      label: 'Processes',
      type: 'group',
    },
    {
      key: 'processes',
      className:
        'SelectedSegment' /* `${activeSegment === 'processes' ? 'SelectedSegment' : ''}` */,
      icon: (
        <EditOutlined
          onClick={() => {
            router.push(`/processes`);
          }}
        />
      ),
      label: (
        <span
          onClick={() => {
            router.push(`/processes`);
          }}
        >
          Process List
        </span>
      ),
      children: [
        // {
        //   key: 'processes',
        //   icon: <EditOutlined />,
        //   label: 'My Processes',
        // },
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

  const getCurrentScreenSize = () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  const [screenSize, setScreenSize] = useState({width: 1000, height: 800});

  useEffect(() => {
    const updateScreenSize = () => {
      setScreenSize(getCurrentScreenSize);
    };
    window.addEventListener('resize', updateScreenSize);

    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, [screenSize]);

  return (
    <AntLayout>
    {/* TODO: Header change for mobile!! */}
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
        {screenSize.width <= 412 ? (
          // Hamburger menu for screens <= 412px
          <>
            <Button
              icon={<MenuOutlined />}
              onClick={() => {
                router.push('/profile');
              }}
            />
          </>
        ) : (
          // Logout and User Profile in header for screens larger than 412px
          <>
            <Button type="text">
              <u>Logout</u>
            </Button>
            <Tooltip title="Account Settings">
              <Button
                shape="circle"
                icon={<UserOutlined />}
                onClick={() => {
                  router.push('/profile');
                }}
              />
            </Tooltip>
          </>
        )}
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
            onClick={({ key }) => {
              router.push(`/${key}`);
            }}
          >
            <ItemGroup key="processes" title="Processes">
              <SubMenu
                key="processes"
                title={
                  <span
                    onClick={() => {
                      router.push(`/processes`);
                    }}
                  >
                    Process List
                  </span>
                }
                className={activeSegment === 'processes' ? 'SelectedSegment' : ''}
                icon={
                  <EditOutlined
                    onClick={() => {
                      router.push(`/processes`);
                    }}
                  />
                }
              >
                <Item key="newProcess" icon={<FileAddOutlined />}>
                  New Process
                </Item>
                <Item key="processFavorites" icon={<StarOutlined />}>
                  Favorites
                </Item>
              </SubMenu>
              <SubMenu key="templates" title="Templates" icon={<ProfileOutlined />}>
                <Item key="newTemplate" icon={<FileAddOutlined />}>
                  New Template
                </Item>
                <Item key="templateFavorites" icon={<StarOutlined />}>
                  Favorites
                </Item>
              </SubMenu>
            </ItemGroup>
            <Divider />
            <ItemGroup key="settings" title="Settings">
              <Item key="generalSettings" icon={<SettingOutlined />}>
                General Settings
              </Item>
              <Item key="plugins" icon={<ApiOutlined />}>
                Plugins
              </Item>
            </ItemGroup>
          </Menu>
          {/* <Menu
            theme="light"
            mode="inline"
            selectedKeys={[activeSegment]}
            items={items}
            onClick={({ key }) => {
              router.push(`/${key}`);
            }}
          /> */}
        </AntLayout.Sider>
        <AntLayout>
          <Content>
            <Space
              direction="vertical"
              size="large"
              style={{ display: 'flex' /* , height: '100%' */ }}
              /* TODO: */
              className="Content"
            >
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
