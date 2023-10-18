'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, useState } from 'react';
import { Layout as AntLayout, Grid, Menu, MenuProps } from 'antd';
const { SubMenu, Item, Divider, ItemGroup } = Menu;
import Logo from '@/public/proceed.svg';
import {
  EditOutlined,
  UnorderedListOutlined,
  ProfileOutlined,
  FileAddOutlined,
  SettingOutlined,
  ApiOutlined,
  UserOutlined,
  StarOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import cn from 'classnames';
import { useAuthStore } from '@/lib/iam';
import Link from 'next/link';

const items: MenuProps['items'] = [
  {
    key: 'processes',
    icon: <EditOutlined />,
    label: 'Processes',
  },
  {
    key: 'projects',
    icon: <UnorderedListOutlined />,
    label: 'Projects',
  },
  {
    key: 'templates',
    icon: <ProfileOutlined />,
    label: 'Templates',
    disabled: true,
  },
];

/**
 * The main layout of the application. It defines the sidebar and footer. Note
 * that the header is not part of this and instead defined in the Content.tsx
 * component. This is because the header should be customizable by the page,
 * while this component stays the same for all pages.
 *
 * This component is meant to be used in layout.tsx files so it stays out of the
 * page content in parallel routes.
 */
const Layout: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const activeSegment = usePathname().slice(1) || 'processes';
  const [collapsed, setCollapsed] = useState(false);
  const ability = useAuthStore((state) => state.ability);
  const loggedIn = useAuthStore((state) => state.loggedIn);
  const breakpoint = Grid.useBreakpoint();

  return (
    <AntLayout>
      <AntLayout hasSider>
        <AntLayout.Sider
          style={{
            backgroundColor: '#fff',
            borderRight: '1px solid #eee',
          }}
          className={styles.Sider}
          collapsible
          collapsed={collapsed}
          onCollapse={(collapsed) => setCollapsed(collapsed)}
          breakpoint="md"
          trigger={null}
        >
          <div className={styles.LogoContainer}>
            <Link href="/processes">
              <Image
                src={breakpoint.xs ? '/proceed-icon.png' : '/proceed.svg'}
                alt="PROCEED Logo"
                className={cn(breakpoint.xs ? styles.Icon : styles.Logo, {
                  [styles.collapsed]: collapsed,
                })}
                width={breakpoint.xs ? 85 : 160}
                height={breakpoint.xs ? 35 : 63}
                priority
              />
            </Link>
          </div>
          {loggedIn ? (
            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[activeSegment]}
              onClick={({ key }) => {
                const path = key.split(':').at(-1);
                router.push(`/${path}`);
              }}
            >
              {ability.can('view', 'Process') || ability.can('view', 'Template') ? (
                <>
                  <ItemGroup key="processes" title="Processes">
                    {ability.can('view', 'Process') ? (
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
                        <Item
                          key="newProcess"
                          icon={<FileAddOutlined />}
                          hidden={!ability.can('create', 'Process')}
                        >
                          New Process
                        </Item>
                        <Item key="processFavorites" icon={<StarOutlined />}>
                          Favorites
                        </Item>
                      </SubMenu>
                    ) : null}

                    {ability.can('view', 'Template') ? (
                      <SubMenu key="templates" title="Templates" icon={<ProfileOutlined />}>
                        <Item
                          key="newTemplate"
                          icon={<FileAddOutlined />}
                          hidden={!ability.can('create', 'Template')}
                        >
                          New Template
                        </Item>
                        <Item key="templateFavorites" icon={<StarOutlined />}>
                          Favorites
                        </Item>
                      </SubMenu>
                    ) : null}
                  </ItemGroup>

                  <Divider />
                </>
              ) : null}

              {ability.can('manage', 'User') ||
              ability.can('manage', 'RoleMapping') ||
              ability.can('manage', 'Role') ? (
                <>
                  <ItemGroup key="IAM" title="IAM">
                    <Item
                      key="iam/users"
                      icon={<UserOutlined />}
                      hidden={!ability.can('manage', 'User')}
                    >
                      Users
                    </Item>

                    <Item
                      key="iam/roles"
                      icon={<UnlockOutlined />}
                      hidden={
                        !(ability.can('manage', 'RoleMapping') || ability.can('manage', 'Role'))
                      }
                    >
                      Roles
                    </Item>
                  </ItemGroup>

                  <Divider />
                </>
              ) : null}

              <ItemGroup key="settings" title="Settings">
                <Item key="generalSettings" icon={<SettingOutlined />}>
                  General Settings
                </Item>
                <Item key="plugins" icon={<ApiOutlined />}>
                  Plugins
                </Item>
              </ItemGroup>
            </Menu>
          ) : null}
        </AntLayout.Sider>
        <div className={cn(styles.Main, { [styles.collapsed]: collapsed })}>{children}</div>
      </AntLayout>
      <AntLayout.Footer className={cn(styles.Footer)}>© 2023 PROCEED Labs GmbH</AntLayout.Footer>
    </AntLayout>
  );
};

export default Layout;
