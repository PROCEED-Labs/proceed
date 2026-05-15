import 'antd/dist/reset.css';
import '@/public/antd.min.css';
import './globals.css';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { FC, PropsWithChildren, Suspense } from 'react';
import App from '@/components/app';

import classNames from 'classnames';
import { getPublicMSConfig } from '@/lib/ms-config/ms-config';

const inter = Inter({ subsets: ['latin'], variable: '--inter' });

const myFont = localFont({ src: './performer-icons.woff', variable: '--custom-icon-font' });

export const metadata = {
  title: 'PROCEED',
  description: 'Next Gen Business Processes',
};

type RootLayoutProps = PropsWithChildren;

const Layout: FC<RootLayoutProps> = async ({ children }) => {
  const publicEnv = await getPublicMSConfig();
  return <App env={publicEnv}>{children}</App>;
};

const RootLayout: FC<RootLayoutProps> = async ({ children }) => {
  return (
    <html lang="en">
      {/* Opting out of static rendering for all routes; */}
      {/* TODO: undo this */}

      <body className={classNames(inter.variable, myFont.variable)}>
        <Suspense fallback={null}>
          <Layout>{children}</Layout>
        </Suspense>
      </body>
    </html>
  );
};

export default RootLayout;
