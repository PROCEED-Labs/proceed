'use client';

import { ReactNode, useEffect } from 'react';
import Theme from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntDesignApp } from 'antd';
import { SessionProvider, signIn } from 'next-auth/react';
import { PublicEnv } from '@/lib/env-vars';
import { EnvVarsProvider } from './env-vars-context';
import { useSession } from './auth-can';

const queryClient = new QueryClient();

const SignInToDefaultUser = () => {
  // When iam is deactivated, a user is hardcoded everywhere,
  // however we still need the useSession hook to return a valid session
  // which doesn't happen when the user doesn't have a session cookie.
  // Afterwards, regardless of the session we will return the default user.
  const session = useSession();
  useEffect(() => {
    if (session.status === 'unauthenticated') signIn('no-iam-user');
  }, [session]);

  return null;
};

const App = ({ children, env }: { children: ReactNode; env: PublicEnv }) => {
  return (
    <SessionProvider>
      {!env.PROCEED_PUBLIC_IAM_ACTIVATE && <SignInToDefaultUser />}
      <EnvVarsProvider env={env}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <AntDesignApp>
            <Theme>{children}</Theme>
          </AntDesignApp>
        </QueryClientProvider>
      </EnvVarsProvider>
    </SessionProvider>
  );
};

export default App;
