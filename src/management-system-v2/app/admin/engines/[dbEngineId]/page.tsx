import { getCurrentUser } from '@/components/auth';
import Content from '@/components/content';
import { Button, Result, Skeleton, Space, Tabs } from 'antd';
import { notFound, redirect } from 'next/navigation';
import { env } from 'process';
import { Suspense } from 'react';
import EngineOverview from './engine-overview';
import Link from 'next/link';
import { LeftOutlined } from '@ant-design/icons';
import ConfigurationTable from './configuration-table';
import { type Engine } from '@/lib/engines/machines';
import { getDbEngineById } from '@/lib/data/db/engines';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { engineRequest } from '@/lib/engines/endpoints/index';

export type TableEngine = Engine & { id: string };

async function Engine({ dbEngineId }: { dbEngineId: string }) {
  const dbEngine = await getDbEngineById(dbEngineId, null, undefined, 'dont-check');
  console.log('dbEngine', dbEngineId, dbEngine);

  if (!dbEngine) throw new Error('Failed to fetch engine');

  const engines = await savedEnginesToEngines([dbEngine]);
  console.log('discoverred engines', engines);
  // TODO: show all engines

  const engine = engines[0];

  if (!engine) throw new Error('Failed to fetch engine');

  const backButton = (
    <Link href="/admin/engines">
      <Button icon={<LeftOutlined />} type="text">
        Engines
      </Button>
    </Link>
  );

  try {
    const calls = await Promise.allSettled([
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

    const configuration = calls[0].status === 'fulfilled' ? calls[0].value : null;
    const machineData = calls[1].status === 'fulfilled' ? calls[1].value : null;

    return (
      <Content
        title={
          <Space style={{ alignItems: 'center' }}>
            {backButton} {machineData.name}
          </Space>
        }
      >
        <Tabs
          style={{ height: '100%' }}
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: <EngineOverview engine={machineData} />,
            },
            {
              key: 'configuration',
              label: 'Configuration',
              children: <ConfigurationTable configuration={configuration} engine={machineData} />,
            },
          ]}
        />
      </Content>
    );
  } catch (e) {
    return (
      <Content title={backButton}>
        <Result status="500" title="Error" subTitle="Couldn't fetch engines" />
      </Content>
    );
  }
}

export default async function EnginesPage({ params }: { params: { dbEngineId: string } }) {
  if (!env.NEXT_PUBLIC_ENABLE_EXECUTION) return notFound();

  const user = await getCurrentUser();
  if (!user.systemAdmin) redirect('/');

  const dbEngineId = decodeURIComponent(params.dbEngineId);

  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton active />
        </Content>
      }
    >
      <Engine dbEngineId={dbEngineId} />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
