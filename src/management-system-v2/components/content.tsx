'use client';

import styles from './content.module.scss';
import { FC, PropsWithChildren, ReactNode, useState } from 'react';
import { Layout as AntLayout, Grid, Button, Image, Drawer, Tooltip, Avatar } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import cn from 'classnames';
import HeaderActions from './header-actions';
import Link from 'next/link';
import MobileMenu from './menu-mobile'
import { UserOutlined } from '@ant-design/icons';
import router, { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import SiderMenu from './menu-sider';

type ContentProps = PropsWithChildren<{
  /** Top left title in the header (or custom node). */
  title?: ReactNode;
  /** If true, the content won't have any padding. */
  compact?: boolean;
  /** If true, the content won't have a header. */
  noHeader?: boolean;
  /** Class name for the wrapper. */
  wrapperClass?: string;
  /** Class name for the header. */
  headerClass?: string;

  siderOpened?: boolean;
}>;

const Content: FC<ContentProps> = ({
  children,
  title,
  compact = false,
  noHeader = false,
  wrapperClass,
  headerClass,
}) => {
  const breakpoint = Grid.useBreakpoint();
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  const showDrawer = () => {
    setOpenMobileMenu(true);
  };

  const onClose = () => {
    setOpenMobileMenu(false);
  };

  const router = useRouter();
  const session = useSession();
  const loggedIn = session.status === 'authenticated';

  if (!process.env.NEXT_PUBLIC_USE_AUTH) {
    return null;
  }


  return (
    <>
    <AntLayout className={cn(styles.Main, wrapperClass)}>
      {noHeader ? null : (
        <AntLayout.Header className={cn(styles.Header, headerClass)}>
          {/* Add icon into header for xs screens*/}
          {breakpoint.xs ? (
            <div className={styles.LogoContainer}>
              <Link href="/processes">
                <Image
                  src={'/proceed-icon.png'}
                  alt="PROCEED Logo"
                  className={styles.Icon}
                  width={breakpoint.xs ? 85 : 160}
                  height={breakpoint.xs ? 35 : 63}
                />
              </Link>
            </div>
          ) : null}

          <div className={styles.Title}>{title}</div>
          {breakpoint.xs ? (
            // Hamburger menu for mobile view
            <div>
              <Button
                className={styles.Hamburger}
                type="text"
                style={{ marginTop: '20px', marginLeft: '15px' }}
                icon={<MenuOutlined style={{ fontSize: '170%' }} />}
                onClick={showDrawer}
              />
            </div>
          ) : (
            // Logout and User Profile in header for screens larger than 412px
            <HeaderActions />
          )}
        </AntLayout.Header>
      )}
      <AntLayout.Content className={cn(styles.Content, { [styles.compact]: compact })}>
        {children}
      </AntLayout.Content>
    </AntLayout>

    <Drawer title={
      loggedIn ? <>
      <Tooltip title={loggedIn ? 'Account Settings' : 'Log in'}>
        <Avatar src={session.data?.user.image} onClick={() => router.push('/profile')}>
          {session.data?.user.image
            ? null
            : session.data?.user.firstName.slice(0, 1) + session.data?.user.lastName.slice(0, 1)}
        </Avatar>
      </Tooltip>
      </> : <>
          <Button type="text" onClick={() => signIn()}>
              <u>Log in</u>
            </Button>

            <Tooltip title="Log in">
              <Button shape="circle" icon={<UserOutlined />} onClick={() => signIn()} />
            </Tooltip>
      </>
    } placement="right" onClose={onClose} open={openMobileMenu}>
      <MobileMenu />
    </Drawer>
    </>
  );
};

export default Content;
