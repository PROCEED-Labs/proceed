import Content from '@/components/content';
import { Result, Space } from 'antd';
import ClientEngineDashboard from '@/components/engine-dashboard/dashboard';
import { ReactNode } from 'react';
import { Engine as DBEngine } from '@prisma/client';

/** Make sure that the user requesting the page has permission to view the engine, this component
 * doesn't check view permissions */
export default async function EngineDashboard({
  engine,
  backButton,
}: {
  engine?: DBEngine & { connections: { reachable: boolean }[] };
  backButton?: ReactNode;
}) {
  if (!engine) {
    return (
      <Content title={backButton}>
        <Result status="404" title="Error" subTitle="Couldn't find engine" />
      </Content>
    );
  }

  return (
    <Content title={<Space style={{ alignItems: 'center' }}>{backButton}</Space>}>
      <ClientEngineDashboard
        online={engine.connections.some((c) => c.reachable)}
        configuration={engine.configuration}
        machineData={engine.data}
      />
    </Content>
  );
}
