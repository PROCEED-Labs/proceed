import { FC, PropsWithChildren } from 'react';
import Layout from '@/components/layout';

const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  return <Layout>{children}</Layout>;
};

export default AuthLayout;
