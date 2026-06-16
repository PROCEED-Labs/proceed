import Content from '@/components/content';
import { Skeleton, Spin } from 'antd';
import { notFound, redirect } from 'next/navigation';
import EngineConnectionsList, { ConnectionStatus } from '@/components/engine-connections-list';
import { getEngineConnections } from '@/lib/data/engines';
import { getCurrentUser } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { resolveEngines } from '@/lib/engines/engine-connections-helpers';
import { type EngineConnection } from '@prisma/client';

const getConnectionStatus = async (connection: EngineConnection) => {
  const engines = await resolveEngines([connection]);

  if (engines.length === 0) {
    return { online: false } as const;
  } else {
    return { online: true, engines } as const;
  }
};

const EnginesPage = async () => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { systemAdmin } = await getCurrentUser();
  if (!systemAdmin) return redirect('/');

  const connections = await getEngineConnections(null, undefined, systemAdmin);

  const connectionsWithStatus = connections.map((connection) => {
    return {
      ...connection,
      status: (
        <Suspense fallback={<Spin spinning />}>
          <ConnectionStatus connectionId={connection.id} status={getConnectionStatus(connection)} />
        </Suspense>
      ),
    };
  });

  return (
    <EngineConnectionsList
      connections={connectionsWithStatus}
      engineDashboardLinkPrefix="/admin/engines"
    />
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
