'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, createContext, use, useEffect, useState } from 'react';
import {
  Alert,
  Layout as AntLayout,
  Button,
  Drawer,
  Grid,
  Menu,
  MenuProps,
  Modal,
  Popover,
  Tooltip,
} from 'antd';
import Image from 'next/image';
import cn from 'classnames';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { create } from 'zustand';
import { Environment } from '@/lib/data/environment-schema';
import UserAvatar from '@/components/user-avatar';
import { spaceURL } from '@/lib/utils';
import useModelerStateStore from './processes/[mode]/[processId]/use-modeler-state-store';
import AuthenticatedUserDataModal from './profile/user-data-modal';
import SpaceLink from '@/components/space-link';
import { useSession } from '@/components/auth-can';
import ChangeUserPasswordModal from './profile/change-password-modal';
import useMSLogo from '@/lib/use-ms-logo';
import { usePathname } from 'next/navigation';
import { MenuItemType } from 'antd/es/menu/interface';

export const useLayoutMobileDrawer = create<{ open: boolean; set: (open: boolean) => void }>(
  (set) => ({
    open: false,
    set: (open: boolean) => set({ open }),
  }),
);

export const UserSpacesContext = createContext<Environment[] | undefined>(undefined);

/** Provide all client components an easy way to read the active space id
 * without filtering the usePath() for /processes etc. */
export const SpaceContext = createContext<{
  spaceId: string;
  isOrganization: boolean;
  customLogo?: string;
}>({ spaceId: '', isOrganization: false });

type ExtendedMenuItem = NonNullable<MenuProps['items']>[number] & {
  openRegex?: string;
  selectedRegex?: string;
  children?: ExtendedMenuItem[];
};

export type ExtendedMenuItems = ExtendedMenuItem[];

const Layout: FC<
  PropsWithChildren<{
    loggedIn: boolean;
    userEnvironments?: Environment[];
    layoutMenuItems: ExtendedMenuItems;
    activeSpace: { spaceId: string; isOrganization: boolean };
    hideSider?: boolean;
    customLogo?: string;
    disableUserDataModal?: boolean;
    userNeedsToChangePassword?: boolean;
    bottomMenuItems?: NonNullable<MenuProps['items']>;
  }>
> = ({
  loggedIn,
  userEnvironments,
  layoutMenuItems: _layoutMenuItems,
  activeSpace,
  children,
  hideSider,
  customLogo,
  disableUserDataModal = false,
  userNeedsToChangePassword: _userNeedsToChangePassword,
  bottomMenuItems,
}) => {
  const session = useSession();
  const userData = session?.data?.user;
  const mobileDrawerOpen = useLayoutMobileDrawer((state) => state.open);
  const setMobileDrawerOpen = useLayoutMobileDrawer((state) => state.set);

  const modelerIsFullScreen = useModelerStateStore((state) => state.isFullScreen);

  const [showLoginRequest, setShowLoginRequest] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const breakpoint = Grid.useBreakpoint();

  const [userNeedsToChangePassword, setUserNeedsToChangePassword] = useState(
    _userNeedsToChangePassword ?? false,
  );

  let layoutMenuItems = _layoutMenuItems;

  if (breakpoint.xs) {
    layoutMenuItems = layoutMenuItems.filter(
      (item) => !(item && 'type' in item && item.type === 'divider'),
    );
  }

  // The space id needs to be set here, because the hook is outside of the SpaceContext.Provider
  const { imageSource } = useMSLogo(customLogo, { spaceId: activeSpace.spaceId });

  const pathname = usePathname();

  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<string[]>([]);

  useEffect(() => {
    const sel: string[] = [];
    const op: string[] = [];

    function check(items: ExtendedMenuItems) {
      for (const item of items) {
        if (item.selectedRegex && pathname.match(item.selectedRegex)) {
          sel.push(item.key as string);
        }
        if (item.openRegex && pathname.match(item.openRegex)) {
          op.push(item.key as string);
        }

        if (item.children) check(item.children);
      }
    }

    check(layoutMenuItems);

    setSelected(sel);
    setOpen(op);
  }, [pathname]);

  // remove the error message about the unknown item entries that is logged by ant-design
  function toMenuItem(item: ExtendedMenuItem): MenuItemType {
    const test = {
      ...item,
      children: item.children?.map(toMenuItem),
    };

    delete test.selectedRegex;
    delete test.openRegex;

    return test as MenuItemType;
  }

  const menuItems = layoutMenuItems.map(toMenuItem);

  const menu = (
    <Menu
      style={{ textAlign: collapsed && !breakpoint.xs ? 'center' : 'start' }}
      mode="inline"
      selectedKeys={selected}
      openKeys={open}
      items={menuItems}
      onClick={breakpoint.xs ? () => setMobileDrawerOpen(false) : undefined}
      onOpenChange={(changed) => setOpen(changed)}
    />
  );

  let bottomMenu;
  if (bottomMenuItems && bottomMenuItems.length > 0) {
    bottomMenu = (
      <Menu
        style={{ textAlign: collapsed && !breakpoint.xs ? 'center' : 'start' }}
        mode="inline"
        items={bottomMenuItems}
        onClick={breakpoint.xs ? () => setMobileDrawerOpen(false) : undefined}
      />
    );
  }

  return (
    <UserSpacesContext.Provider value={userEnvironments}>
      <SpaceContext.Provider value={activeSpace}>
        {!disableUserDataModal && userData && !userData.isGuest ? (
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
            modalProps={{ closeIcon: null, destroyOnHidden: true }}
          />
        ) : null}

        {userNeedsToChangePassword && (
          <ChangeUserPasswordModal
            open={true}
            close={(passwordChanged) => {
              if (passwordChanged) {
                setUserNeedsToChangePassword(false);
              }
            }}
            title="You need to set your password"
            hint={
              <Alert message="Your account still has a temporary password, in order to use PROCEED you need to set a new password" />
            }
            modalProps={{ closable: false }}
          />
        )}

        <AntLayout style={{ height: '100vh' }}>
          <AntLayout hasSider>
            {!hideSider && (
              <AntLayout.Sider
                style={{
                  backgroundColor: '#fff',
                  borderRight: '1px solid #eee',
                  display: modelerIsFullScreen ? 'none' : 'block',
                  overflow: 'auto',
                }}
                className={cn(styles.Sider)}
                collapsible
                collapsed={collapsed}
                onCollapse={(collapsed) => setCollapsed(collapsed)}
                collapsedWidth={breakpoint.xs ? '0' : '75'}
                breakpoint="xl"
                theme="light"
              >
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '8px',
                        height: '64px',
                      }}
                    >
                      <Link className={styles.LogoContainer} href={spaceURL(activeSpace, `/start`)}>
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
                    </div>
                    {loggedIn ? menu : null}
                  </div>
                  <div>
                    {bottomMenu}
                    <AntLayout.Footer
                      style={{ display: modelerIsFullScreen ? 'none' : 'block' }}
                      className={cn(styles.Footer)}
                    >
                      <Popover
                        title="PROCEED Labs GmbH"
                        content={
                          <div>
                            <a href="https://proceed-labs.org" target="_blank">
                              https://www.proceed-labs.org
                            </a>
                            <div>Tel.: +49 151 57425665</div>
                            <div>
                              Email:{' '}
                              <a href="mailto:info@proceed-labs.org">info@proceed-labs.org</a>
                            </div>
                          </div>
                        }
                        placement="bottomLeft"
                      >
                        PROCEED Labs GmbH
                      </Popover>
                    </AntLayout.Footer>
                  </div>
                </div>
              </AntLayout.Sider>
            )}

            <div className={cn(styles.Main, { [styles.collapsed]: false })}>{children}</div>
          </AntLayout>
        </AntLayout>

        <Drawer
          title={
            loggedIn ? (
              <Tooltip title="Account Settings">
                <UserAvatar user={userData} />
              </Tooltip>
            ) : (
              <Button type="text" onClick={() => signIn()}>
                <u>Sign In</u>
              </Button>
            )
          }
          placement="right"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {menu}
            {bottomMenu}
          </div>
        </Drawer>

        <Modal
          title={null}
          footer={null}
          closable={false}
          open={showLoginRequest}
          onCancel={() => setShowLoginRequest(false)}
          styles={{ mask: { backdropFilter: 'blur(10px)' }, content: { padding: 0 } }}
        >
          <Alert
            type="warning"
            style={{ zIndex: '1000' }}
            message={
              <>
                To store and change settings,{' '}
                <SpaceLink href={'/signin'}>please log in as user.</SpaceLink>
              </>
            }
          />
        </Modal>
      </SpaceContext.Provider>
    </UserSpacesContext.Provider>
  );
};

export default Layout;
