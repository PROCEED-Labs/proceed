import Content from '@/components/content';
import { Result, Space } from 'antd';
import { type Engine } from '@/lib/engines/machines';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { engineRequest } from '@/lib/engines/endpoints/index';
import ClientEngineDashboard from '@/components/engine-dashboard/dashboard';
import { type Engine as DBEngine } from '@prisma/client';
import { ReactNode } from 'react';

export type TableEngine = Engine & { id: string };

/** Make sure that the user requesting the page has permission to view the engine, this component
 * doesn't check view permissions */
export default async function EngineDashboard({
  dbEngine,
  engineId,
  backButton,
}: {
  dbEngine?: DBEngine;
  engineId?: string;
  backButton?: ReactNode;
}) {
  if (!dbEngine) {
    return (
      <Content title={backButton}>
        <Result status="404" title="Error" subTitle="Couldn't find engine" />
      </Content>
    );
  }

  const engines = await savedEnginesToEngines([dbEngine]);
  let engine: Engine | undefined = engines[0];
  if (engineId) engine = engines.find((e) => e.id === engineId);

  if (!engine) {
    return (
      <Content title={backButton}>
        <Result status="404" title="Error" subTitle="Couldn't find engine" />
      </Content>
    );
  }

  try {
    const [configuration, machineData] = await Promise.all([
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

    return (
      <Content title={<Space style={{ alignItems: 'center' }}>{backButton}</Space>}>
        <ClientEngineDashboard configuration={configuration} machineData={machineData} />
      </Content>
    );
  } catch (e) {
    // TODO: get more information about error
    return (
      <Content title={backButton}>
        <Result status="500" title="Error" subTitle="Couldn't fetch engine data" />
      </Content>
    );
  }
}
