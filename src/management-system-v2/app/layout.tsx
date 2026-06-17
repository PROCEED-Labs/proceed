import 'antd/dist/reset.css';
import '@/public/antd.min.css';
import './globals.css';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { FC, PropsWithChildren } from 'react';
import App from '@/components/app';

import classNames from 'classnames';
import { getPublicMSConfig } from '@/lib/ms-config/ms-config';
import DeploymentRefetchBoundary from './deployment-refetch-boundary';
import EngineRefetchBoundary from './transfer-processes/engine-refetch-boundary';

const inter = Inter({ subsets: ['latin'], variable: '--inter' });

const myFont = localFont({ src: './performer-icons.woff', variable: '--custom-icon-font' });

export const metadata = {
  title: 'PROCEED',
  description: 'Next Gen Business Processes',
};

type RootLayoutProps = PropsWithChildren;

const RootLayout: FC<RootLayoutProps> = async ({ children }) => {
  const publicEnv = await getPublicMSConfig();
  return (
    <html lang="en">
      <body className={classNames(inter.variable, myFont.variable)}>
        <EngineRefetchBoundary
          enabled={publicEnv.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE}
          interval={5}
        >
          <DeploymentRefetchBoundary
            enabled={publicEnv.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE}
            interval={publicEnv.PROCEED_PUBLIC_DEPLOYMENT_REFETCHING_INTERVAL}
          >
            <App env={publicEnv}>{children}</App>
          </DeploymentRefetchBoundary>
        </EngineRefetchBoundary>
      </body>
    </html>
  );
};

export default RootLayout;
