'use client';

import { ReactNode } from 'react';
import Theme from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntDesignApp } from 'antd';
import { SessionProvider } from 'next-auth/react';
import { PublicMSConfig } from '@/lib/ms-config/config-schema';
import { EnvVarsProvider } from './env-vars-context';

const queryClient = new QueryClient();

const App = ({ children, env }: { children: ReactNode; env: PublicMSConfig }) => {
  return (
    <SessionProvider>
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
