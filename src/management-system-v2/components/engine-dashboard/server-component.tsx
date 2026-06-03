import Content from '@/components/content';
import { Result, Space } from 'antd';
import { type Engine } from '@/lib/engines/types';
import { resolveEngines } from '@/lib/engines/engine-connections-helpers';
import { engineRequest } from '@/lib/engines/endpoints/index';
import ClientEngineDashboard from '@/components/engine-dashboard/dashboard';
import { type EngineConnection } from '@prisma/client';
import { ReactNode } from 'react';

export type TableEngine = Engine & { id: string };

/** Make sure that the user requesting the page has permission to view the engine, this component
 * doesn't check view permissions */
export default async function EngineDashboard({
  connection,
  engineId,
  backButton,
}: {
  connection?: EngineConnection;
  engineId?: string;
  backButton?: ReactNode;
}) {
  if (!connection) {
    return (
      <Content title={backButton}>
        <Result status="404" title="Error" subTitle="Couldn't find engine" />
      </Content>
    );
  }

  const engines = await resolveEngines([connection]);
  let engine: Engine | undefined = engines[0];
  if (engineId) engine = engines.find((e) => e.id === engineId);

  if (!engine) {
    return (
      <Content title={backButton}>
        <Result status="404" title="Error" subTitle="Couldn't find engine" />
      </Content>
    );
  }

  const [configuration, machineData] = await Promise.allSettled([
    engineRequest({
      engine,
      method: 'get',
      endpoint: '/configuration/',
    }),
    engineRequest({
      engine,
      method: 'get',
      endpoint: '/machine/',
    }),
  ]);

  if (configuration.status === 'rejected' || machineData.status === 'rejected') {
    // TODO: get more information about error
    return (
      <Content title={backButton}>
        <Result status="500" title="Error" subTitle="Couldn't fetch engine data" />
      </Content>
    );
  }

  return (
    <Content title={<Space style={{ alignItems: 'center' }}>{backButton}</Space>}>
      <ClientEngineDashboard configuration={configuration.value} machineData={machineData.value} />
    </Content>
  );
}
