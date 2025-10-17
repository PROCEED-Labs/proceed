import Link from 'next/link';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import { AreaChartOutlined, AppstoreOutlined, FileOutlined } from '@ant-design/icons';
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
    selectedRegex: '/admin$',
  },
  {
    key: 'spaces',
    label: <Link href="/admin/spaces">Spaces</Link>,
    icon: <AppstoreOutlined />,
    selectedRegex: '/admin/spaces($|/)',
  },
  {
    key: 'users',
    label: <Link href="/admin/users">Users</Link>,
    icon: <FaUsers />,
    selectedRegex: '/admin/users($|/)',
  },
  {
    key: 'systemadmins',
    label: <Link href="/admin/systemadmins">Manage admins</Link>,
    icon: <RiAdminFill />,
    selectedRegex: '/admin/systemadmins($|/)',
  },
  {
    key: 'engines',
    label: <Link href="/admin/engines">Engines</Link>,
    icon: <MdOutlineComputer />,
    selectedRegex: '/admin/engines($|/)',
  },
  {
    key: 'ms-config',
    label: <Link href="/admin/ms-config">MS Config</Link>,
    icon: <FaGear />,
    selectedRegex: '/admin/ms-config($|/)',
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
