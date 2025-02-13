import Link from 'next/link';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import { AreaChartOutlined, AppstoreOutlined, FileOutlined } from '@ant-design/icons';
import { MdOutlineComputer } from 'react-icons/md';
import { AiOutlineDatabase } from 'react-icons/ai';
import { FaUsers } from 'react-icons/fa';
import { RiAdminFill } from 'react-icons/ri';

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
              icon: <FaUsers />,
            },
            {
              key: 'systemadmins',
              label: <Link href="/admin/systemadmins">Manage admins</Link>,
              icon: <RiAdminFill />,
            },
            {
              key: 'saved-engines',
              label: <Link href="/admin/saved-engines">Saved Engines</Link>,
              icon: <AiOutlineDatabase />,
            },
            {
              key: 'engines',
              label: <Link href="/admin/engines">Engines</Link>,
              icon: <MdOutlineComputer />,
            },
          ],
        },
      ]}
    >
      {children}
    </Layout>
  );
}
