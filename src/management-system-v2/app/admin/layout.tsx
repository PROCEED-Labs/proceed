import Link from 'next/link';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import { AreaChartOutlined, AppstoreOutlined } from '@ant-design/icons';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      activeSpace={{ spaceId: '', isOrganization: false }}
      loggedIn={true}
      userEnvironments={[]}
      layoutMenuItems={[
        {
          type: 'group',
          label: 'System Admin views',
          children: [
            {
              key: 'dashboard',
              label: <Link href="/admin">Dashboard</Link>,
              icon: <AreaChartOutlined />,
            },
            {
              key: 'spaces',
              label: <Link href="/admin/spaces">Spaces</Link>,
              icon: <AppstoreOutlined />,
            },
            {
              key: 'users',
              label: <Link href="/admin/users">Users</Link>,
              icon: <AppstoreOutlined />,
            },
          ],
        },
      ]}
    >
      {children}
    </Layout>
  );
}
