import 'antd/dist/reset.css';
import '@/public/antd.min.css';
import './globals.css';
import { Inter } from 'next/font/google';
import { FC, PropsWithChildren } from 'react';
import App from '@/components/app';
import { ConfigProvider } from 'antd';

const inter = Inter({ subsets: ['latin'], variable: '--inter' });

export const metadata = {
  title: 'PROCEED',
  description: 'Next Gen Business Processes',
};

type RootLayoutProps = PropsWithChildren;

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en">
      <head>
        <script src="https://connect-cdn.atl-paas.net/all.js" async></script>
      </head>
      <body className={inter.variable}>
        <App>{children}</App>
      </body>
    </html>
  );
};

export default RootLayout;
