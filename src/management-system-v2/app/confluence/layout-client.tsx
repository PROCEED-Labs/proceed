'use client';

import styles from './layout.module.scss';
import { FC, PropsWithChildren, useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import cn from 'classnames';
import { signIn, useSession } from 'next-auth/react';
import { SpaceContext } from '../(dashboard)/[environmentId]/layout-client';
import './globals.css';

/** Provide all client components an easy way to read the active space id
 * without filtering the usePath() for /processes etc. */

const Layout: FC<
  PropsWithChildren<{
    activeSpace: { spaceId: string; isOrganization: boolean };
    hideFooter?: boolean;
    redirectUrl?: string;
  }>
> = ({ activeSpace, children, hideFooter, redirectUrl }) => {
  const session = useSession();

  useEffect(() => {
    if (
      window &&
      window.AP &&
      window.AP.context &&
      session.status === 'unauthenticated' &&
      redirectUrl
    ) {
      window.AP.context.getToken((token) => {
        signIn('confluence-signin', { token, redirect: true, callbackUrl: redirectUrl });
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
