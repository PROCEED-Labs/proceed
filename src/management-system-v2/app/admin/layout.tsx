import Link from 'next/link';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import { AreaChartOutlined, AppstoreOutlined, LeftSquareOutlined } from '@ant-design/icons';
import { MdOutlineComputer } from 'react-icons/md';
import { AiOutlineDatabase } from 'react-icons/ai';
import { FaUsers } from 'react-icons/fa';
import { RiAdminFill } from 'react-icons/ri';
import { type ReactNode } from 'react';
import { FaGear } from 'react-icons/fa6';
import { env } from '@/lib/ms-config/env-vars';
import { notFound } from 'next/navigation';

let adminViews = [
  {
    key: 'dashboard',
    label: <Link href="/admin">Dashboard</Link>,
    icon: <AreaChartOutlined />,
  },
  {
    key: 'spaces',
    label: <Link href="/admin/spaces">All Spaces</Link>,
    icon: <AppstoreOutlined />,
  },
  {
    key: 'users',
    label: <Link href="/admin/users">All Users</Link>,
    icon: <FaUsers />,
  },
  {
    key: 'systemadmins',
    label: <Link href="/admin/systemadmins">System Admins</Link>,
    icon: <RiAdminFill />,
  },
  {
    key: 'engines',
    label: <Link href="/admin/engines">System Engines</Link>,
    icon: <MdOutlineComputer />,
  },
  {
    key: 'ms-config',
    label: <Link href="/admin/ms-config">System Settings</Link>,
    icon: <FaGear />,
  },
];

if (!env.PROCEED_PUBLIC_IAM_ACTIVE)
  adminViews = adminViews.filter(({ key }) => !['users', 'systemadmins'].includes(key));

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (
    env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE &&
    !env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE
  ) {
    return notFound();
  }

  return (
    <Layout
      activeSpace={{ spaceId: '', isOrganization: false }}
      loggedIn={true}
      layoutMenuItems={[
        {
          type: 'group',
          label: '',
          children: [
            {
              key: 'back-to-proceed',
              label: <Link href="/">Back to Home</Link>,
              icon: <LeftSquareOutlined />,
            },
          ],
        },
        {
          type: 'group',
          label: 'MS System Admin Views',
          children: adminViews,
        },
      ]}
    >
      {children}
    </Layout>
  );
}
