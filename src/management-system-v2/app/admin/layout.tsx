import Link from 'next/link';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout
      activeSpace={{ spaceId: '', isOrganization: false }}
      loggedIn={true}
      userEnvironments={[]}
      layoutMenuItems={[
        {
          key: 'spaces',
          label: <Link href="/admin">Spaces</Link>,
        },
      ]}
    >
      {children}
    </Layout>
  );
}
