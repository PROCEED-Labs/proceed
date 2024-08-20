'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, createContext, useState } from 'react';
import { Layout as AntLayout, Button, Drawer, Grid, Menu, MenuProps, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import Image from 'next/image';
import cn from 'classnames';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { create } from 'zustand';
import { Environment } from '@/lib/data/environment-schema';
import UserAvatar from '@/components/user-avatar';
import { spaceURL } from '@/lib/utils';
import useModelerStateStore from './processes/[processId]/use-modeler-state-store';
import AuthenticatedUserDataModal from './profile/user-data-modal';

export const useLayoutMobileDrawer = create<{ open: boolean; set: (open: boolean) => void }>(
  (set) => ({
    open: false,
    set: (open: boolean) => set({ open }),
  }),
);

export const UserSpacesContext = createContext<Environment[] | null>(null);

/** Provide all client components an easy way to read the active space id
 * without filtering the usePath() for /processes etc. */
export const SpaceContext = createContext<{
  spaceId: string;
  isOrganization: boolean;
  customLogo?: string;
}>({ spaceId: '', isOrganization: false });

const Layout: FC<
  PropsWithChildren<{
    loggedIn: boolean;
    userEnvironments: Environment[];
    layoutMenuItems: NonNullable<MenuProps['items']>;
    activeSpace: { spaceId: string; isOrganization: boolean };
    hideSider?: boolean;
    customLogo?: string;
  }>
> = ({
  loggedIn,
  userEnvironments,
  layoutMenuItems: _layoutMenuItems,
  activeSpace,
  children,
  hideSider,
  customLogo,
}) => {
  const session = useSession();
  const userData = session?.data?.user;

  const mobileDrawerOpen = useLayoutMobileDrawer((state) => state.open);
  const setMobileDrawerOpen = useLayoutMobileDrawer((state) => state.set);

  const modelerIsFullScreen = useModelerStateStore((state) => state.isFullScreen);

  const [collapsed, setCollapsed] = useState(false);
  const breakpoint = Grid.useBreakpoint();

  const layoutMenuItems = _layoutMenuItems.filter(
    (item) => !(breakpoint.xs && item && 'type' in item && item.type === 'divider'),
  );

  let imageSource = breakpoint.xs ? '/proceed-icon.png' : '/proceed.svg';
  if (customLogo) imageSource = customLogo;

  const menu = (
    <Menu
      theme="light"
      style={{ textAlign: collapsed && !breakpoint.xs ? 'center' : 'start' }}
      mode="inline"
      items={layoutMenuItems}
    />
  );

  return (
    <UserSpacesContext.Provider value={userEnvironments}>
      <SpaceContext.Provider value={{ ...activeSpace, customLogo }}>
        {userData && !userData.guest ? (
          <AuthenticatedUserDataModal
            modalOpen={!userData.username || !userData.lastName || !userData.firstName}
            userData={userData}
            close={() => {}}
            structure={{
              title: 'You need to complete your profile to continue',
              password: false,
              inputFields: [
                {
                  label: 'First Name',
                  submitField: 'firstName',
                  userDataField: 'firstName',
                },
                {
                  label: 'Last Name',
                  submitField: 'lastName',
                  userDataField: 'lastName',
                },
                {
                  label: 'Username',
                  submitField: 'username',
                  userDataField: 'username',
                },
              ],
            }}
            modalProps={{ closeIcon: null, destroyOnClose: true }}
          />
        ) : null}

        <AntLayout style={{ height: '100vh' }}>
          <AntLayout hasSider>
            {!hideSider && (
              <AntLayout.Sider
                style={{
                  backgroundColor: '#fff',
                  borderRight: '1px solid #eee',
                  display: modelerIsFullScreen ? 'none' : 'block',
                }}
                className={cn(styles.Sider)}
                collapsible
                collapsed={collapsed}
                onCollapse={(collapsed) => setCollapsed(collapsed)}
                collapsedWidth={breakpoint.xs ? '0' : '100'}
                breakpoint="xl"
                trigger={null}
              >
                <Link className={styles.LogoContainer} href={spaceURL(activeSpace, `/processes`)}>
                  <Image
                    src={imageSource}
                    alt="PROCEED Logo"
                    className={cn(styles.Logo, {
                      [styles.collapsed]: collapsed,
                    })}
                    width={160}
                    height={63}
                    priority
                  />
                </Link>

                {loggedIn ? menu : null}
              </AntLayout.Sider>
            )}

            <div className={cn(styles.Main, { [styles.collapsed]: false })}>{children}</div>
          </AntLayout>
          <AntLayout.Footer
            style={{ display: modelerIsFullScreen ? 'none' : 'block' }}
            className={cn(styles.Footer)}
          >
            © 2024 PROCEED Labs GmbH
          </AntLayout.Footer>
        </AntLayout>

        <Drawer
          title={
            loggedIn ? (
              <>
                <Tooltip title="Account Settings">
                  <UserAvatar user={userData} />
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
    </UserSpacesContext.Provider>
  );
};

export default Layout;
