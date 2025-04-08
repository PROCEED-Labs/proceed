import Link from 'next/link';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import { AreaChartOutlined, AppstoreOutlined, FileOutlined } from '@ant-design/icons';
import { MdOutlineComputer } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import { RiAdminFill } from 'react-icons/ri';
import { env } from '@/lib/env-vars';

let adminViews = [
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
    icon: <FaUsers />,
  },
  {
    key: 'systemadmins',
    label: <Link href="/admin/systemadmins">Manage admins</Link>,
    icon: <RiAdminFill />,
  },
  {
    key: 'engines',
    label: <Link href="/admin/engines">Engines</Link>,
    icon: <MdOutlineComputer />,
  },
];

if (!env.PROCEED_PUBLIC_IAM_ACTIVATE)
  adminViews = adminViews.filter(({ key }) => !['users', 'systemadmins'].includes(key));

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      activeSpace={{ spaceId: '', isOrganization: false }}
      loggedIn={true}
      layoutMenuItems={[
        {
          type: 'group',
          label: 'PROCEED',
          children: [
            {
              key: 'back-to-proceed',
              label: <Link href="/">Processes</Link>,
              icon: <FileOutlined />,
            },
          ],
        },
        {
          type: 'group',
          label: 'System Admin views',
          children: adminViews,
        },
      ]}
    >
      {children}
    </Layout>
  );
}
