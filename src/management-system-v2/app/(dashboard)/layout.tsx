import { FC, PropsWithChildren } from 'react';
import Layout from '@/components/layout';

const DashboardLayout: FC<PropsWithChildren> = ({ children }) => {
  return <Layout>{children}</Layout>;
};

export default DashboardLayout;
