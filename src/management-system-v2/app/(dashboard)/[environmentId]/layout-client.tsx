'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, createContext, useState } from 'react';
import { Layout as AntLayout, Button, Drawer, Grid, Menu, MenuProps, Select, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import Image from 'next/image';
import cn from 'classnames';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { create } from 'zustand';
import { useRouter } from 'next/navigation';
import { Environment } from '@/lib/data/environment-schema';
import { useEnvironment } from '@/components/auth-can';
import UserAvatar from '@/components/user-avatar';
import { spaceURL } from '@/lib/utils';

export const useLayoutMobileDrawer = create<{ open: boolean; set: (open: boolean) => void }>(
  (set) => ({
    open: false,
    set: (open: boolean) => set({ open }),
  }),
);

/** Provide all client components an easy way to read the active space id
 * without filtering the usePath() for /processes etc. */
export const SpaceContext = createContext({ spaceId: '', isOrganization: false });

const Layout: FC<
  PropsWithChildren<{
    loggedIn: boolean;
    userEnvironments: Environment[];
    layoutMenuItems: NonNullable<MenuProps['items']>;
    activeSpace: { spaceId: string; isOrganization: boolean };
  }>
> = ({ loggedIn, userEnvironments, layoutMenuItems: _layoutMenuItems, activeSpace, children }) => {
  const session = useSession();
  const router = useRouter();

  const mobileDrawerOpen = useLayoutMobileDrawer((state) => state.open);
  const setMobileDrawerOpen = useLayoutMobileDrawer((state) => state.set);

  const [collapsed, setCollapsed] = useState(false);
  const breakpoint = Grid.useBreakpoint();

  const layoutMenuItems = _layoutMenuItems.filter(
    (item) => !(breakpoint.xs && item && 'type' in item && item.type === 'divider'),
  );

  const menu = <Menu theme="light" mode="inline" items={layoutMenuItems} />;

  return (
    <SpaceContext.Provider value={activeSpace}>
      <AntLayout style={{ height: '100vh' }}>
        <AntLayout hasSider>
          <AntLayout.Sider
            style={{
              backgroundColor: '#fff',
              borderRight: '1px solid #eee',
            }}
            className={cn(styles.Sider)}
            collapsible
            collapsed={collapsed}
            onCollapse={(collapsed) => setCollapsed(collapsed)}
            collapsedWidth={breakpoint.xs ? '0' : '80'}
            breakpoint="xl"
            trigger={null}
          >
            <div className={styles.LogoContainer}>
              <Link href={spaceURL(activeSpace, `/processes`)}>
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

            <div style={{ padding: '1rem' }}>
              <Select
                options={userEnvironments.map((environment) => ({
                  label: environment.organization ? environment.name : 'Personal Environment',
                  value: environment.id,
                }))}
                defaultValue={activeSpace.spaceId}
                onChange={(envId) => {
                  const space = userEnvironments.find((env) => env.id === envId);
                  router.push(
                    spaceURL(
                      { spaceId: space?.id ?? '', isOrganization: space?.organization ?? false },
                      `/processes`,
                    ),
                  );
                }}
                style={{ width: '100%' }}
              />
            </div>

            {loggedIn ? menu : null}
          </AntLayout.Sider>

          <div className={cn(styles.Main, { [styles.collapsed]: false })}>{children}</div>
        </AntLayout>
        <AntLayout.Footer className={cn(styles.Footer)}>© 2023 PROCEED Labs GmbH</AntLayout.Footer>
      </AntLayout>

      <Drawer
        title={
          loggedIn ? (
            <>
              <Tooltip title="Account Settings">
                <UserAvatar user={session.data?.user} />
              </Tooltip>
            </>
          ) : (
            <>
              <Button type="text" onClick={() => signIn()}>
                <u>Log in</u>
              </Button>

              <Tooltip title="Log in">
                <Button shape="circle" icon={<UserOutlined />} onClick={() => signIn()} />
              </Tooltip>
            </>
          )
        }
        placement="right"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
      >
        {menu}
      </Drawer>
    </SpaceContext.Provider>
  );
};

export default Layout;
