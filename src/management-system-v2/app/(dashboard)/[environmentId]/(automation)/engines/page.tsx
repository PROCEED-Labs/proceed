import Content from '@/components/content';
import { Skeleton, Spin } from 'antd';
import { notFound } from 'next/navigation';
import EngineConnectionsList, { ConnectionStatus } from '@/components/engine-connections-list';
import { getEngineConnections } from '@/lib/data/engines';
import { getCurrentEnvironment } from '@/components/auth';
import { Suspense } from 'react';
import { getMSConfig } from '@/lib/ms-config/ms-config';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { spaceURL } from '@/lib/utils';
import UnauthorizedFallback from '@/components/unauthorized-fallback';
import { Connection } from '@/lib/engines/types';

const getConnectionStatus = async (connection: Connection) => {
  if (connection.engines.reduce((count, e) => (count += e.reachable ? 1 : 0), 0) === 0) {
    return { online: false } as const;
  } else {
    return { online: true, engines: connection.engines } as const;
  }
};

type PageProps = { params: Promise<{ environmentId: string }> };

const EnginesPage = async ({ environmentId }: { environmentId: string }) => {
  const msConfig = await getMSConfig();
  if (!msConfig.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) return notFound();

  const { activeEnvironment, ability } = await getCurrentEnvironment(environmentId);

  const machinesSettings = await getSpaceSettingsValues(
    activeEnvironment.spaceId,
    'process-automation.process-engines',
  );

  if (machinesSettings.active === false) {
    return notFound();
  }

  const connections = await getEngineConnections(activeEnvironment.spaceId, ability);

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
      engineDashboardLinkPrefix={spaceURL(activeEnvironment, '/engines')}
    />
  );
};

const Page = async (props: PageProps) => {
  const params = await props.params;

  const { ability } = await getCurrentEnvironment(params.environmentId);
  if (!ability.can('view', 'Machine')) return <UnauthorizedFallback />;

  return (
    <Content title="Engines">
      <Suspense fallback={<Skeleton />}>
        <EnginesPage environmentId={params.environmentId} />
      </Suspense>
    </Content>
  );
};

export default Page;
