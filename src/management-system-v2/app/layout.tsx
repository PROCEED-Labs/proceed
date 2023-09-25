import 'antd/dist/reset.css';
import '@/public/antd.min.css';
import './globals.css';
import { Inter } from 'next/font/google';
import { FC, PropsWithChildren } from 'react';
import Layout from '@/components/layout';
import App from '@/components/app';
import { AuthCallbackListener } from '@/lib/iamComponents';

const inter = Inter({ subsets: ['latin'], variable: '--inter' });

export const metadata = {
  title: 'PROCEED',
  description: 'Next Gen Business Processes',
};

type RootLayoutProps = PropsWithChildren;

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <App>
          <AuthCallbackListener />
          <Layout>{children}</Layout>
        </App>
      </body>
    </html>
  );
};

export default RootLayout;
