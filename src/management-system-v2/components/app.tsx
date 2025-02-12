'use client';

import { ReactNode } from 'react';
import Theme from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntDesignApp } from 'antd';
import { SessionProvider } from 'next-auth/react';
import { PublicEnv } from '@/lib/env-vars';
import { EnvVarsProvider } from './env-vars-context';

const queryClient = new QueryClient();

const App = ({ children, env }: { children: ReactNode; env: PublicEnv }) => {
  return (
    <EnvVarsProvider env={env}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <AntDesignApp>
            <Theme>{children}</Theme>
          </AntDesignApp>
        </QueryClientProvider>
      </SessionProvider>
    </EnvVarsProvider>
  );
};

export default App;
