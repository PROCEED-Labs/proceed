import 'antd/dist/reset.css';
import '@/public/antd.min.css';
import './globals.css';
import { Inter } from 'next/font/google';
import { FC, PropsWithChildren } from 'react';
import App from '@/components/app';

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
        <App>{children}</App>
      </body>
    </html>
  );
};

export default RootLayout;
