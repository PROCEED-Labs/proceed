import 'antd/dist/reset.css';
import '@/public/antd.min.css';
import './globals.css';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { FC, PropsWithChildren } from 'react';
import App from '@/components/app';

import classNames from 'classnames';
import { publicEnv } from '@/lib/env-vars';

const inter = Inter({ subsets: ['latin'], variable: '--inter' });

const myFont = localFont({ src: './performer-icons.woff', variable: '--custom-icon-font' });

export const metadata = {
  title: 'PROCEED',
  description: 'Next Gen Business Processes',
};

type RootLayoutProps = PropsWithChildren;

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en">
      <body className={classNames(inter.variable, myFont.variable)}>
        <App env={publicEnv}>{children}</App>
      </body>
    </html>
  );
};

export default RootLayout;
