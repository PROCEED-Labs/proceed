'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, createContext, useEffect } from 'react';
import { Layout as AntLayout, Grid, MenuProps } from 'antd';
import cn from 'classnames';
import { Environment } from '@/lib/data/environment-schema';
import { signIn, useSession } from 'next-auth/react';
import { SpaceContext } from '../(dashboard)/[environmentId]/layout-client';
import './globals.css';
import { redirect } from 'next/navigation';

/** Provide all client components an easy way to read the active space id
 * without filtering the usePath() for /processes etc. */

const Layout: FC<
  PropsWithChildren<{
    loggedIn: boolean;
    userEnvironments: Environment[];
    layoutMenuItems: NonNullable<MenuProps['items']>;
    activeSpace: { spaceId: string; isOrganization: boolean };
    hideFooter?: boolean;
    redirectUrl?: string;
  }>
> = ({
  loggedIn,
  userEnvironments,
  layoutMenuItems: _layoutMenuItems,
  activeSpace,
  children,
  hideFooter,
  redirectUrl,
}) => {
  console.log('layout');
  const session = useSession();

  useEffect(() => {
    console.log('use effect layout client', session);
    if (window && window.AP && window.AP.context && session.status === 'unauthenticated') {
      console.log('get Token', window.AP.context);
      console.log('redirectUrl', redirectUrl);
      window.AP.context.getToken((token) => {
        console.log('JWT Token', token);
        signIn('confluence-signin', { token, redirect: true, callbackUrl: redirectUrl })
          .then((res) => {
            console.log('signin response', res);
            // if (redirectUrl) redirect(redirectUrl);
          })
          .catch((err) => {
            console.log('signin catch', err);
          });
      });
    }
  }, [session.status]);

  return (
    <SpaceContext.Provider value={activeSpace}>
      <AntLayout>
        <AntLayout style={{ background: 'white' }}>
          <div className={cn(styles.Main, { [styles.collapsed]: false })}>{children}</div>
        </AntLayout>
        <AntLayout.Footer
          style={{ display: hideFooter ? 'none' : 'block' }}
          className={cn(styles.Footer)}
        >
          © 2024 PROCEED Labs GmbH
        </AntLayout.Footer>
      </AntLayout>
    </SpaceContext.Provider>
  );
};

export default Layout;
