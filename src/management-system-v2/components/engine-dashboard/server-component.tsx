import Content from '@/components/content';
import { Result, Space } from 'antd';
import { Engine } from '@/lib/engines/types';
import { engineRequest } from '@/lib/engines/endpoints/index';
import ClientEngineDashboard from '@/components/engine-dashboard/dashboard';
import { ReactNode } from 'react';

/** Make sure that the user requesting the page has permission to view the engine, this component
 * doesn't check view permissions */
export default async function EngineDashboard({
  engine,
  backButton,
}: {
  engine?: Engine;
  backButton?: ReactNode;
}) {
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

  machineData.value.online = true;

  return (
    <Content title={<Space style={{ alignItems: 'center' }}>{backButton}</Space>}>
      <ClientEngineDashboard configuration={configuration.value} machineData={machineData.value} />
    </Content>
  );
}
