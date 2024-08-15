'use client';

import { FC, PropsWithChildren } from 'react';
import Theme from './theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App as AntDesignApp } from 'antd';
import { SessionProvider } from 'next-auth/react';
import type { MessageInstance } from 'antd/es/message/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { NotificationInstance } from 'antd/es/notification/interface';

let message: MessageInstance;
let notification: NotificationInstance;
let modal: Omit<ModalStaticFunctions, 'warn'>;

const SetFeedbackFunctions = () => {
  const staticFunction = AntDesignApp.useApp();
  message = staticFunction.message;
  modal = staticFunction.modal;
  notification = staticFunction.notification;
  return null;
};

export { message, modal, notification };

const queryClient = new QueryClient();

const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <AntDesignApp>
          <>
            <SetFeedbackFunctions />
            <Theme>{children}</Theme>
          </>
        </AntDesignApp>
      </QueryClientProvider>
    </SessionProvider>
  );
};

export default App;
