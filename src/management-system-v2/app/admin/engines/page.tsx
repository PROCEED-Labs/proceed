import Content from '@/components/content';
import { Skeleton } from 'antd';
import { notFound, redirect } from 'next/navigation';
import EngineConnectionsList from '@/components/engine-connections-list';
import { getEngineConnections } from '@/lib/data/engines';
import { getCurrentUser } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';

const EnginesPage = async () => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return redirect('/');

  const connections = await getEngineConnections(null, undefined, systemAdmin);

  return (
    <EngineConnectionsList connections={connections} engineDashboardLinkPrefix="/admin/engines" />
  );
};

const Page = () => {
  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <EnginesPage />
      </Suspense>
    </Content>
  );
};

export default Page;
