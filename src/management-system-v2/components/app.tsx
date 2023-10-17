'use client';

import { FC, PropsWithChildren } from 'react';
import Theme from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntDesignApp } from 'antd';
import { AuthCallbackListener } from '@/lib/iamComponents';

const queryClient = new QueryClient();

const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <AntDesignApp>
        <AuthCallbackListener />
        <Theme>{children}</Theme>
      </AntDesignApp>
    </QueryClientProvider>
  );
};

export default App;
