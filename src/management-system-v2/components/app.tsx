'use client';

import { FC, PropsWithChildren } from 'react';
import Theme from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <Theme>{children}</Theme>
    </QueryClientProvider>
  );
};

export default App;
